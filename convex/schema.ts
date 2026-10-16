// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Системні таблиці авторизації Convex Auth
  ...authTables,

  // Користувачі
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()), // Унікальний нікнейм (@username), зберігається в нижньому регістрі
    bio: v.optional(v.string()), // Статус або короткий опис профілю
    avatarStorageId: v.optional(v.id("_storage")), // Файл аватарки в Convex Storage
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  // Чат-кімнати
  chatRooms: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    creatorId: v.id("users"),
    lastMessage: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
  }).index("by_creator", ["creatorId"]),

  // Повідомлення в кімнатах
  messages: defineTable({
    chatRoomId: v.id("chatRooms"),
    senderId: v.id("users"),
    senderName: v.string(),
    senderPhoto: v.optional(v.string()),
    content: v.optional(v.string()), // Текст або підпис до фото
    imageUrl: v.optional(v.string()), // Посилання на зображення
    storageId: v.optional(v.id("_storage")), // ID файлу в Convex Storage
    isEdited: v.optional(v.boolean()), // Прапорець редагування

    // Відповідь на повідомлення (цитування)
    replyToId: v.optional(v.id("messages")), // Повідомлення, на яке відповідають
    replyToSender: v.optional(v.string()), // Автор оригінального повідомлення
    replyToText: v.optional(v.string()), // Текст оригіналу (порожньо для фото без підпису)
  })
    .index("by_chat_room", ["chatRoomId"])
    .index("by_sender", ["senderId"]), // Для статистики профілю

  // Індикатор набору тексту (окрема таблиця, бо оновлюється дуже часто)
  typingIndicators: defineTable({
    chatRoomId: v.id("chatRooms"),
    userId: v.id("users"),
    userName: v.string(),
    lastTypedAt: v.number(),
  })
    .index("by_chat_room_and_last_typed_at", ["chatRoomId", "lastTypedAt"])
    .index("by_user_and_chat_room", ["userId", "chatRoomId"]),
});
