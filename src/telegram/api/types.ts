import { z } from "zod/v4";
import { type Prettify } from "../../common/types.js";
import {
  TgChatSchema,
  TgMediaSchema,
  TgReplyMarkup,
} from "./groups/chats/chats-types.js";
import {
  TgPaymentSchema,
  TgRefundedPaymentSchema,
  TgSuccessfulPaymentSchema,
} from "./groups/payments/payments-types.js";
import {
  TgCallbackQueryId,
  TgChatId,
  TgMessageId,
  TgMessageThreadId,
  TgParseMode,
  TgUpdateId,
  TgUserId,
} from "./core.js";

export type ApiErrorReflector = (err: unknown) => Promise<void>;

export type TgCore<Response> = {
  /**
   * Highlights if the request was successful
   */
  ok: boolean;
  result: Response;
  description?: string;
  error_code?: number;
  parameters?: TgErrorParameters;
};

const TgErrorParametersSchema = z
  .object({
    migrate_to_chat_id: z.optional(TgChatId),
    /**
     * If present, tell us when we can retry the request, in seconds
     */
    retry_after: z.optional(z.number()),
  })
  .describe("[ResponseParameters] Telegram error parameters schema");

export type TgErrorParameters = z.infer<typeof TgErrorParametersSchema>;

export const TgCoreSchema = <Schema extends z.ZodTypeAny>(schema: Schema) => {
  return z.object({
    /**
     * Highlights if the request was successful
     */
    ok: z.boolean(),
    result: schema,
    description: z.optional(z.string()),
    error_code: z.optional(z.number()),
    parameters: z.optional(TgErrorParametersSchema),
  });
};

const TgUserSchema = z
  .object({
    id: TgUserId,
    is_bot: z.boolean(),
    first_name: z.string(),
    last_name: z.optional(z.string()),
    username: z.optional(z.string()),
    language_code: z.optional(z.string()),
  })
  .describe("[User] Telegram user object schema validator");

const TgCheckoutQuerySchema = z
  .intersection(
    TgPaymentSchema,
    z.object({
      id: z.string(),
      from: TgUserSchema,
    }),
  )
  .describe("[PreCheckoutQuery] Telegram checkout query schema validator");

export type TgCheckoutQuery = Prettify<z.infer<typeof TgCheckoutQuerySchema>>;

export const TgMessageSchema = z
  .object({
    message_id: TgMessageId,
    date: z.number(),
    chat: TgChatSchema,
    text: z.optional(z.string()),
    from: z.optional(TgUserSchema),
    voice: z.optional(TgMediaSchema),
    audio: z.optional(TgMediaSchema),
    video_note: z.optional(TgMediaSchema),
    successful_payment: z.optional(TgSuccessfulPaymentSchema),
    refunded_payment: z.optional(TgRefundedPaymentSchema),
    is_topic_message: z.optional(z.boolean()),
    message_thread_id: z.optional(TgMessageThreadId),
  })
  .describe("[Message] Telegram chat message schema validator");

export type TgMessage = z.infer<typeof TgMessageSchema>;

const TgCallbackQuerySchema = z
  .object({
    id: TgCallbackQueryId,
    from: TgUserSchema,
    message: z.optional(TgMessageSchema),
    data: z.optional(z.string()),
  })
  .describe("[CallbackQuery] Telegram callback query schema validator");

export type TgCallbackQuery = z.infer<typeof TgCallbackQuerySchema>;

export const TgUpdateSchema = z
  .object({
    update_id: TgUpdateId,
    message: z.optional(TgMessageSchema),
    callback_query: z.optional(TgCallbackQuerySchema),
    pre_checkout_query: z.optional(TgCheckoutQuerySchema),
  })
  .describe("[Update] Telegram incoming message schema validator");

export type TgUpdate = z.infer<typeof TgUpdateSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MessageSchema = z
  .object({
    chat_id: TgChatId,
    text: z.string(),
    message_id: z.optional(TgMessageId),
    parse_mode: z.optional(TgParseMode),
    reply_markup: z.optional(TgReplyMarkup),
    message_thread_id: z.optional(TgMessageThreadId),
  })
  .describe("Telegram message schema");

export type MessageDto = z.infer<typeof MessageSchema>;
