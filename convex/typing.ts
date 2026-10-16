// convex/typing.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const TYPING_TIMEOUT_MS = 3000; // 3 секунди неактивності

/**
 * Оновлює мітку часу набору тексту для поточного користувача
 */
export const setTyping = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const user = await ctx.db.get(userId);
    if (!user) return;

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_and_chat_room", (q) =>
        q.eq("userId", userId).eq("chatRoomId", args.chatRoomId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { lastTypedAt: now });
    } else {
      await ctx.db.insert("typingIndicators", {
        chatRoomId: args.chatRoomId,
        userId,
        userName: user.name ?? user.email ?? "Співрозмовник",
        lastTypedAt: now,
      });
    }
  },
});

/**
 * Користувачі (крім поточного), які друкують у кімнаті.
 * Convex-запит не перевиконується сам із плином часу, тому замість
 * готового списку повертаємо, скільки мс кожному лишилось "друкувати" —
 * клієнт сам прибирає індикатор по таймеру (і не залежить від різниці годинників).
 */
export const getTypingUsers = query({
  args: {
    chatRoomId: v.id("chatRooms"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const threshold = now - TYPING_TIMEOUT_MS;

    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_chat_room_and_last_typed_at", (q) =>
        q.eq("chatRoomId", args.chatRoomId).gt("lastTypedAt", threshold)
      )
      .collect();

    return indicators
      .filter((ind) => ind.userId !== userId)
      .map((ind) => ({
        userName: ind.userName,
        expiresInMs: ind.lastTypedAt + TYPING_TIMEOUT_MS - now,
      }));
  },
});
