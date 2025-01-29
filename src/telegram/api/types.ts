import { z } from "zod";
import { type Prettify } from "../../common/types.ts";

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
    migrate_to_chat_id: z.optional(z.number()),
    /**
     * If present, tell us when we can retry the request, in seconds
     */
    retry_after: z.optional(z.number()),
  })
  .describe("Telegram error parameters schema");

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

const TgMediaSchema = z
  .object({
    file_id: z.string(),
    duration: z.number(),
    mime_type: z.optional(z.string()),
  })
  .describe("Telegram media file schema validator");

export type TgMedia = z.infer<typeof TgMediaSchema>;

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
    }),
  )
  .describe("Telegram checkout query schema validator");

export type TgCheckoutQuery = Prettify<z.infer<typeof TgCheckoutQuerySchema>>;

const TgSuccessfulPaymentSchema = z
  .intersection(
    TgPaymentSchema,
    z.object({
      telegram_payment_charge_id: z.string(),
      provider_payment_charge_id: z.string(),
    }),
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

export type TgChatType = z.infer<typeof TgChatTypeSchema>;

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

export type TgMessage = z.infer<typeof TgMessageSchema>;

const TgCallbackQuerySchema = z
  .object({
    id: z.string(),
    from: TgUserSchema,
    message: z.optional(TgMessageSchema),
    data: z.optional(z.string()),
  })
  .describe("Telegram callback query schema validator");

export type TgCallbackQuery = z.infer<typeof TgCallbackQuerySchema>;

export const TgUpdateSchema = z
  .object({
    update_id: z.number(),
    message: z.optional(TgMessageSchema),
    callback_query: z.optional(TgCallbackQuerySchema),
    pre_checkout_query: z.optional(TgCheckoutQuerySchema),
  })
  .describe("Telegram incoming message schema validator");

export type TgUpdate = z.infer<typeof TgUpdateSchema>;

export const TgSetWebHookSchema = z
  .boolean()
  .describe("Telegram webhook api response schema validator");

export const TgWebHookSchema = z
  .object({
    url: z.string(),
  })
  .describe("Telegram web hook schema");

export type TgWebHook = Prettify<z.infer<typeof TgWebHookSchema>>;

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

const BotCommandSchema = z
  .object({
    command: z.string(),
    description: z.string(),
  })
  .describe("Telegram bot command schema");

export type BotCommandDto = z.infer<typeof BotCommandSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BotCommandListSchema = z
  .object({
    commands: z.array(BotCommandSchema),
  })
  .describe("Telegram bot command list schema");

export type BotCommandListDto = z.infer<typeof BotCommandListSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MessageSchema = z
  .object({
    chat_id: z.number(),
    text: z.string(),
    message_id: z.optional(z.number()),
    parse_mode: z.optional(
      z.union([
        z.literal("HTML"),
        z.literal("Markdown"),
        z.literal("MarkdownV2"),
      ]),
    ),
    reply_markup: z.optional(
      z.object({
        inline_keyboard: z.array(z.array(TgInlineKeyboardButtonSchema)),
      }),
    ),
    message_thread_id: z.optional(z.number()),
  })
  .describe("Telegram message schema");

export type MessageDto = z.infer<typeof MessageSchema>;

const LabeledPriceSchema = z
  .object({
    label: z.string(),
    /**
     * Integer cents
     */
    amount: z.number(),
  })
  .describe("Telegram price schema");

const TgCurrencySchema = z.literal("EUR").describe("Telegram currency schema");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const InvoiceSchema = z
  .object({
    chat_id: z.number(),
    title: z.string(), // Product name
    description: z.string(), // Product description
    payload: z.string(), // Internal data
    provider_token: z.string(), // Provider token
    currency: TgCurrencySchema,
    prices: z.array(LabeledPriceSchema),
    start_parameter: z.string(), // Donation id
    photo_url: z.string(),
    photo_width: z.number(),
    photo_height: z.number(),
    message_thread_id: z.optional(z.number()), // Forum thread id
  })
  .describe("Telegram invoice schema");

export type InvoiceDto = z.infer<typeof InvoiceSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PreCheckoutQuerySchema = z
  .object({
    pre_checkout_query_id: z.string(),
    ok: z.boolean(),
    error_message: z.optional(z.string()),
  })
  .describe("Telegram pre-checkout query schema");

export type PreCheckoutQueryDto = z.infer<typeof PreCheckoutQuerySchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EditMessageSchema = z
  .object({
    chat_id: z.optional(z.union([z.number(), z.string()])),
    message_id: z.optional(z.number()),
    text: z.string(),
  })
  .describe("Telegram edit message schema");

export type EditMessageDto = z.infer<typeof EditMessageSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FileSchema = z
  .object({
    file_id: z.string(),
  })
  .describe("Telegram file link schema");

export type FileDto = z.infer<typeof FileSchema>;

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

export const TgLeaveChatSchema = z
  .boolean()
  .describe("Telegram leave chat schema");

export type TgLeaveChatSchema = z.infer<typeof TgLeaveChatSchema>;

const TgPhotoSchema = z
  .object({
    url: z.string(),
    height: z.number(),
    width: z.number(),
  })
  .describe("Telegram photo object schema");

export type TgPhoto = z.infer<typeof TgPhotoSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TgInvoiceSchema = z
  .intersection(
    LabeledPriceSchema,
    z.object({
      chatId: z.number(),
      meta: z.string(),
      token: z.string(),
      title: z.string(),
      description: z.string(),
      payload: z.string(),
      photo: TgPhotoSchema,
      forumThreadId: z.optional(z.number()),
    }),
  )

  .describe("Telegram invoice schema");

export type TgInvoice = z.infer<typeof TgInvoiceSchema>;
