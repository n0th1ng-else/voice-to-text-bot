import { z } from "zod";
import { Prettify } from "../../common/types.js";

export interface TgCore<Response> {
  /**
   * Highlights if the request was successful
   */
  ok: boolean;
  result: Response;
  description?: string;
  error_code?: number;
  parameters?: TgErrorParameters;
}

export interface TgErrorParameters {
  migrate_to_chat_id?: number;
  /**
   * If present, tell us when we can retry the request, in seconds
   */
  retry_after?: number;
}

const TgMediaSchema = z
  .object({
    file_id: z.string(),
    duration: z.number(),
    mime_type: z.optional(z.string()),
  })
  .describe("Telegram media file schema validator");

const TgUserSchema = z
  .object({
    id: z.number(),
    is_bot: z.boolean(),
    first_name: z.string(),
    last_name: z.optional(z.string()),
    username: z.optional(z.string()),
    language_code: z.optional(z.string()),
  })
  .describe("Telegram user object schema validator");

const TgPaymentSchema = z
  .object({
    currency: z.string(),
    total_amount: z.number(),
    invoice_payload: z.string(),
  })
  .describe("Telegram payment schema validator");

const TgCheckoutQuerySchema = z
  .intersection(
    TgPaymentSchema,
    z.object({
      id: z.string(),
      from: TgUserSchema,
    })
  )
  .describe("Telegram checkout query schema validator");

const TgSuccessfulPaymentSchema = z
  .intersection(
    TgPaymentSchema,
    z.object({
      telegram_payment_charge_id: z.string(),
      provider_payment_charge_id: z.string(),
    })
  )
  .describe("Telegram successful payment schema validator");

const TgChatTypeSchema = z
  .union([
    z.literal("private"),
    z.literal("group"),
    z.literal("supergroup"),
    z.literal("channel"),
  ])
  .describe("Telegram chat type schema validator");

const TgChatSchema = z
  .object({
    id: z.number(),
    type: TgChatTypeSchema,
    title: z.optional(z.string()),
    username: z.optional(z.string()),
    first_name: z.optional(z.string()),
    last_name: z.optional(z.string()),
  })
  .describe("Telegram chat schema validator");

const TgMessageSchema = z
  .object({
    message_id: z.number(),
    date: z.number(),
    chat: TgChatSchema,
    text: z.optional(z.string()),
    from: z.optional(TgUserSchema),
    voice: z.optional(TgMediaSchema),
    audio: z.optional(TgMediaSchema),
    video_note: z.optional(TgMediaSchema),
    successful_payment: z.optional(TgSuccessfulPaymentSchema),
    is_topic_message: z.optional(z.boolean()),
    message_thread_id: z.optional(z.number()),
  })
  .describe("Telegram chat message schema validator");

const TgCallbackQuerySchema = z
  .object({
    id: z.string(),
    from: TgUserSchema,
    message: z.optional(TgMessageSchema),
    data: z.optional(z.string()),
  })
  .describe("Telegram callback query schema validator");

export const TgUpdateSchema = z
  .object({
    update_id: z.number(),
    message: z.optional(TgMessageSchema),
    callback_query: z.optional(TgCallbackQuerySchema),
    pre_checkout_query: z.optional(TgCheckoutQuerySchema),
  })
  .describe("Telegram incoming message schema validator");

export const TgSetWebHookSchema = z
  .boolean()
  .describe("Telegram webhook api response schema validator");

export const TgWebHookSchema = z.object({
  url: z.string(),
});

export type TgUpdate = z.infer<typeof TgUpdateSchema>;

export type TgMessage = z.infer<typeof TgMessageSchema>;

export type TgMedia = z.infer<typeof TgMediaSchema>;

export type TgChatType = z.infer<typeof TgChatTypeSchema>;

export type TgCallbackQuery = z.infer<typeof TgCallbackQuerySchema>;

export type TgCheckoutQuery = Prettify<z.infer<typeof TgCheckoutQuerySchema>>;

export type TgWebHook = Prettify<z.infer<typeof TgWebHookSchema>>;

export interface TgInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface BotCommandListDto {
  commands: BotCommandDto[];
}

export interface BotCommandDto {
  command: string;
  description: string;
}

export interface MessageDto {
  chat_id: number;
  text: string;
  message_id?: number;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: {
    inline_keyboard: TgInlineKeyboardButton[][];
  };
  message_thread_id?: number;
}

interface LabeledPrice {
  label: string;
  amount: number; // Integer cents
}

export interface InvoiceDto {
  chat_id: number;
  title: string; // Product name
  description: string; // Product description
  payload: string; // Internal data
  provider_token: string; // Provider token
  currency: string; // EUR
  prices: LabeledPrice[];
  start_parameter: string; // Donation id
  photo_url: string;
  photo_width: number;
  photo_height: number;
  message_thread_id?: number; // Forum thread id
}

export interface PreCheckoutQueryDto {
  pre_checkout_query_id: string;
  ok: boolean;
  error_message?: string;
}

export interface EditMessageDto {
  chat_id?: number | string;
  message_id?: number;
  text: string;
}

export interface FileDto {
  file_id: string;
}

export interface TgFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export class TgError extends Error {
  public code = 0;
  public response?: TgCore<void>;
  public migrateToChatId = 0;
  public retryAfter = 0;
  public url = "";

  constructor(message = "Telegram request was unsuccessful", stack?: string) {
    super(`ETELEGRAM ${message}`);
    if (stack) {
      this.stack = `${this.stack}\n${stack}`;
    }
  }

  public setErrorCode(code = 0): this {
    this.code = code;
    return this;
  }

  public setResponse(response?: TgCore<void>): this {
    this.response = response;
    return this;
  }

  public setRetryAfter(retryAfter = 0): this {
    this.retryAfter = retryAfter;
    return this;
  }

  public setMigrateToChatId(migrateToChatId = 0): this {
    this.migrateToChatId = migrateToChatId;
    return this;
  }

  public setUrl(url: string): this {
    this.url = url;
    return this;
  }
}
