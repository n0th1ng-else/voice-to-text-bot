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

export const TgMessageThreadId = z.number().brand<"MessageThreadId">();

export type MessageThreadId = z.infer<typeof TgMessageThreadId>;

export const TgFileId = z.string().brand<"FileId">();

export type FileId = z.infer<typeof TgFileId>;

export const TgParseMode = z
  .union([z.literal("HTML"), z.literal("Markdown"), z.literal("MarkdownV2")])
  .describe("Message parse more");

export const TgPaymentChargeId = z.string().brand<"PaymentChargeId">();

export type PaymentChargeId = z.infer<typeof TgPaymentChargeId>;
