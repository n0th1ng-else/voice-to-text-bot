import { z } from "zod/v4";
import { TgChatId, TgFileId, TgMessageId, TgParseMode } from "../../core.js";

export const TgFileSchema = z
  .object({
    file_id: TgFileId,
    file_unique_id: z.string(),
    file_size: z.optional(z.number()),
    file_path: z.optional(z.string()),
  })
  .describe("Telegram file schema");

export type TgFile = z.infer<typeof TgFileSchema>;

const TgInlineKeyboardButtonSchema = z
  .object({
    text: z.string(),
    callback_data: z.optional(z.string()),
    url: z.optional(z.string()),
  })
  .describe("Telegram inline keyboard button schema");

export type TgInlineKeyboardButton = z.infer<
  typeof TgInlineKeyboardButtonSchema
>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TgMessageOptionsSchema = z
  .object({
    buttons: z.optional(z.array(z.array(TgInlineKeyboardButtonSchema))),
    disableMarkup: z.optional(z.boolean()),
  })
  .describe("Telegram message options schema");

export type TgMessageOptions = z.infer<typeof TgMessageOptionsSchema>;

export const TgReplyMarkup = z
  .object({
    inline_keyboard: z.array(z.array(TgInlineKeyboardButtonSchema)),
  })
  .describe("Button layout attached to the message");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EditMessageSchema = z
  .object({
    chat_id: TgChatId,
    message_id: TgMessageId,
    text: z.string(),
    parse_mode: z.optional(TgParseMode),
    reply_markup: z.optional(TgReplyMarkup),
  })
  .describe("Telegram edit message schema");

export type EditMessageDto = z.infer<typeof EditMessageSchema>;

export const TgMediaSchema = z
  .object({
    file_id: TgFileId,
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
