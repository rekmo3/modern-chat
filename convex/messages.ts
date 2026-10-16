// convex/messages.ts
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Скидає індикатор набору для користувача після відправки повідомлення
 */
async function clearTyping(
  ctx: MutationCtx,
  userId: Id<"users">,
  chatRoomId: Id<"chatRooms">
) {
  const indicator = await ctx.db
    .query("typingIndicators")
    .withIndex("by_user_and_chat_room", (q) =>
      q.eq("userId", userId).eq("chatRoomId", chatRoomId)
    )
    .first();
  if (indicator) {
    await ctx.db.delete(indicator._id);
  }
}

/**
 * Текст прев'ю останнього повідомлення для списку чатів
 */
function previewOf(message: { content?: string; storageId?: unknown }) {
  if (message.storageId) {
    return message.content ? `📷 Фото (${message.content})` : "📷 Фото";
  }
  return message.content;
}

/**
 * Знімок цитованого повідомлення. Дані беремо з бази, а не від клієнта,
 * щоб неможливо було підробити автора чи текст цитати.
 */
async function buildReplyFields(
  ctx: MutationCtx,
  chatRoomId: Id<"chatRooms">,
  replyToId: Id<"messages"> | undefined
) {
  if (!replyToId) return {};

  const original = await ctx.db.get(replyToId);
  if (!original || original.chatRoomId !== chatRoomId) {
    throw new Error("Повідомлення для відповіді не знайдено в цьому чаті");
  }

  return {
    replyToId,
    replyToSender: original.senderName,
    replyToText: original.content?.slice(0, 200),
  };
}

/**
 * Отримання списку повідомлень у вказаній кімнаті в хронологічному порядку
 */
export const listMessages = query({
  args: { chatRoomId: v.id("chatRooms") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .order("asc")
      .collect();

    // Ім'я та аватар у повідомленні — це знімок на момент відправки.
    // Підставляємо актуальні дані профілю, щоб нова аватарка/ім'я
    // з'являлися й у старих повідомленнях.
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = await Promise.all(senderIds.map((id) => ctx.db.get(id)));
    const sendersById = new Map(
      senders.flatMap((user) => (user ? [[user._id, user] as const] : []))
    );

    return messages.map((message) => {
      const sender = sendersById.get(message.senderId);
      if (!sender) return message;
      return {
        ...message,
        senderName: sender.name ?? sender.email ?? message.senderName,
        senderPhoto: sender.image ?? message.senderPhoto,
      };
    });
  },
});

/**
 * Відправка нового повідомлення
 */
export const sendMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    content: v.string(),
    replyToId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found: Користувача не знайдено");
    }

    const replyFields = await buildReplyFields(ctx, args.chatRoomId, args.replyToId);

    const trimmedContent = args.content.trim();
    if (!trimmedContent) {
      throw new Error("Message content cannot be empty");
    }

    // 1. Зберігаємо повідомлення
    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,
      senderName: user.name ?? user.email ?? "Гравець",
      senderPhoto: user.image,
      content: trimmedContent,
      ...replyFields,
    });

    // 2. Оновлюємо останнє повідомлення в кімнаті для швидкого перегляду у списку
    await ctx.db.patch(args.chatRoomId, {
      lastMessage: trimmedContent,
      lastMessageAt: Date.now(),
    });

    // 3. Користувач відправив повідомлення — більше не "друкує"
    await clearTyping(ctx, userId, args.chatRoomId);

    return messageId;
  },
});

/**
 * Редагування тексту власного повідомлення
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found: Повідомлення не знайдено");
    }

    // Редагувати дозволено лише власні повідомлення
    if (message.senderId !== userId) {
      throw new Error("Forbidden: Ви можете редагувати лише власні повідомлення");
    }

    const trimmedContent = args.content.trim();
    // Підпис до фото можна прибрати, текстове повідомлення — ні
    if (!trimmedContent && !message.storageId) {
      throw new Error("Повідомлення не може бути порожнім");
    }

    await ctx.db.patch(args.messageId, {
      content: trimmedContent || undefined,
      isEdited: true,
    });

    // Якщо це останнє повідомлення в кімнаті — оновлюємо прев'ю у списку чатів
    const lastMessage = await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", message.chatRoomId))
      .order("desc")
      .first();

    if (lastMessage?._id === args.messageId) {
      await ctx.db.patch(message.chatRoomId, {
        lastMessage: previewOf({
          content: trimmedContent || undefined,
          storageId: message.storageId,
        }),
      });
    }
  },
});

/**
 * Видалення власного повідомлення
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found: Повідомлення не знайдено");
    }

    // Видаляти дозволено лише власні повідомлення
    if (message.senderId !== userId) {
      throw new Error("Forbidden: Ви можете видаляти лише власні повідомлення");
    }

    // Видаляємо файл зображення зі сховища
    if (message.storageId) {
      await ctx.storage.delete(message.storageId);
    }
    await ctx.db.delete(args.messageId);

    // Оновлюємо прев'ю кімнати на попереднє повідомлення (або очищуємо)
    const room = await ctx.db.get(message.chatRoomId);
    if (!room) return;

    const lastRemaining = await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", message.chatRoomId))
      .order("desc")
      .first();

    await ctx.db.patch(message.chatRoomId, {
      lastMessage: lastRemaining ? previewOf(lastRemaining) : undefined,
      lastMessageAt: lastRemaining?._creationTime ?? room._creationTime,
    });
  },
});

/**
 * Генерація тимчасового посилання для завантаження файлу в сховище
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Відправка повідомлення із зображенням
 */
export const sendMediaMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    replyToId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found: Користувача не знайдено");
    }

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error("Не вдалося отримати URL завантаженого зображення");
    }

    const caption = args.caption?.trim() || undefined;
    const replyFields = await buildReplyFields(ctx, args.chatRoomId, args.replyToId);

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,
      senderName: user.name ?? user.email ?? "Гравець",
      senderPhoto: user.image,
      imageUrl,
      storageId: args.storageId,
      content: caption,
      ...replyFields,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: previewOf({ content: caption, storageId: args.storageId }),
      lastMessageAt: Date.now(),
    });

    await clearTyping(ctx, userId, args.chatRoomId);

    return messageId;
  },
});
