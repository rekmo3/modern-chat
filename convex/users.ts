// convex/users.ts
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const NAME_MAX = 50;
const BIO_MAX = 150;
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

// Ліміт підрахунку статистики: запити лишаються обмеженими навіть для дуже активних користувачів
const STATS_CAP = 1000;

/**
 * Отримання поточного авторизованого користувача
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

/**
 * Генерація одноразового посилання для завантаження аватарки в Convex Storage
 */
export const generateAvatarUploadUrl = mutation({
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
 * Оновлення профілю поточного користувача
 */
export const updateUserProfile = mutation({
  args: {
    name: v.string(),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
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

    // Ім'я
    const name = args.name.trim();
    if (!name) {
      throw new ConvexError("Ім'я користувача не може бути порожнім");
    }
    if (name.length > NAME_MAX) {
      throw new ConvexError(`Ім'я не може бути довшим за ${NAME_MAX} символів`);
    }

    // Нікнейм: без «@», у нижньому регістрі, унікальний
    const username = args.username?.trim().replace(/^@/, "").toLowerCase() || undefined;
    if (username) {
      if (!USERNAME_REGEX.test(username)) {
        throw new ConvexError(
          "Нікнейм: 3–20 символів, лише латиниця, цифри та підкреслення"
        );
      }
      const taken = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", username))
        .first();
      if (taken && taken._id !== userId) {
        throw new ConvexError("Цей нікнейм уже зайнятий");
      }
    }

    // Біографія
    const bio = args.bio?.trim() || undefined;
    if (bio && bio.length > BIO_MAX) {
      throw new ConvexError(`Статус не може бути довшим за ${BIO_MAX} символів`);
    }

    // Порожнє значення (undefined) у patch прибирає поле з документа
    const patch: {
      name: string;
      username: string | undefined;
      bio: string | undefined;
      image?: string;
      avatarStorageId?: typeof args.avatarStorageId;
    } = { name, username, bio };

    // Новий аватар: оновлюємо URL і ID файлу, а старий файл видаляємо зі сховища
    if (args.avatarStorageId) {
      const imageUrl = await ctx.storage.getUrl(args.avatarStorageId);
      if (!imageUrl) {
        throw new ConvexError("Не вдалося отримати URL завантаженого фото");
      }
      patch.image = imageUrl;
      patch.avatarStorageId = args.avatarStorageId;

      if (user.avatarStorageId && user.avatarStorageId !== args.avatarStorageId) {
        await ctx.storage.delete(user.avatarStorageId);
      }
    }

    await ctx.db.patch(userId, patch);
    return { success: true };
  },
});

/**
 * Публічний профіль користувача зі статистикою активності.
 * Email повертається лише власнику профілю.
 */
export const getUserProfile = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    if (!viewerId) return null;

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", args.userId))
      .take(STATS_CAP);

    const rooms = await ctx.db
      .query("chatRooms")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
      .take(STATS_CAP);

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name ?? user.email ?? "Користувач",
      email: viewerId === args.userId ? user.email : undefined,
      image: user.image,
      username: user.username,
      bio: user.bio,
      stats: {
        messagesCount: messages.length,
        roomsCreatedCount: rooms.length,
        // true, якщо досягнуто ліміт підрахунку (показуємо «1000+»)
        messagesCapped: messages.length >= STATS_CAP,
        roomsCapped: rooms.length >= STATS_CAP,
      },
    };
  },
});
