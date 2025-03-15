import { z } from "zod";

export const TgChatId = z.number().brand<"ChatId">();

export type ChatId = z.infer<typeof TgChatId>;

export const TgMessageId = z.number().brand<"MessageId">();

export type MessageId = z.infer<typeof TgMessageId>;

export const TgUpdateId = z.number().brand<"UpdateId">();

export type UpdateId = z.infer<typeof TgUpdateId>;

export const TgCallbackQueryId = z.string().brand<"CallbackQueryId">();

export type CallbackQueryId = z.infer<typeof TgCallbackQueryId>;

export const TgUserId = z.number().brand<"UserId">();

export type UserId = z.infer<typeof TgUserId>;
