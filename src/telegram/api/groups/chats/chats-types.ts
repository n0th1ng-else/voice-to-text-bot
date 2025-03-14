import { z } from "zod";
import { TgChatId } from "../../core.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TgFileSchema = z
  .object({
    file_id: z.string(),
    file_unique_id: z.string(),
    file_size: z.optional(z.number()),
    file_path: z.optional(z.string()),
  })
  .describe("Telegram file schema");

export type TgFile = z.infer<typeof TgFileSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FileSchema = z
  .object({
    file_id: z.string(),
  })
  .describe("Telegram file link schema");

export type FileDto = z.infer<typeof FileSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EditMessageSchema = z
  .object({
    chat_id: z.optional(TgChatId),
    message_id: z.optional(z.number()),
    text: z.string(),
  })
  .describe("Telegram edit message schema");

export type EditMessageDto = z.infer<typeof EditMessageSchema>;

export const TgMediaSchema = z
  .object({
    file_id: z.string(),
    duration: z.number(),
    mime_type: z.optional(z.string()),
  })
  .describe("Telegram media file schema validator");

export type TgMedia = z.infer<typeof TgMediaSchema>;

export const TgChatTypeSchema = z
  .union([
    z.literal("private"),
    z.literal("group"),
    z.literal("supergroup"),
    z.literal("channel"),
  ])
  .describe("Telegram chat type schema validator");

export type TgChatType = z.infer<typeof TgChatTypeSchema>;

export const TgChatSchema = z
  .object({
    id: TgChatId,
    type: TgChatTypeSchema,
    title: z.optional(z.string()),
    username: z.optional(z.string()),
    first_name: z.optional(z.string()),
    last_name: z.optional(z.string()),
  })
  .describe("Telegram chat schema validator");

export const TgLeaveChatSchema = z
  .boolean()
  .describe("Telegram leave chat schema");

export type TgLeaveChatSchema = z.infer<typeof TgLeaveChatSchema>;
