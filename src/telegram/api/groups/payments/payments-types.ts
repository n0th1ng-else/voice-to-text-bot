import { z } from "zod";
import type { Prettify } from "../../../../common/types.js";
import { TgChatId, TgMessageThreadId } from "../../core.js";

export const TgSubscriptionChangeSchema = z
  .boolean()
  .describe("Telegram subscription change result schema");

export const TgSubscriptionUrlSchema = z
  .string()
  .describe("Telegram subscription url result schema");

export const TgCurrencySchema = z
  .union([
    z.literal("EUR").describe("Euro"),
    z.literal("XTR").describe("Stars"),
  ])
  .describe("Telegram currency schema");

export const TgPaymentSchema = z
  .object({
    currency: TgCurrencySchema,
    total_amount: z.number(),
    invoice_payload: z.string(),
  })
  .describe("Telegram payment schema validator");

export const TgSuccessfulPaymentSchema = z
  .intersection(
    TgPaymentSchema,
    z.object({
      telegram_payment_charge_id: z.string(),
      provider_payment_charge_id: z.string(),
    }),
  )
  .describe("Telegram successful payment schema validator");

export const LabeledPriceSchema = z
  .object({
    label: z.string(),
    /**
     * Integer cents
     */
    amount: z.number(),
  })
  .describe("Telegram price schema");

const PaymentObjectSchema = z
  .object({
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
  })
  .describe("Telegram payment object base");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SubscriptionSchema = z
  .intersection(
    PaymentObjectSchema,
    z.object({
      subscription_period: z.number(),
    }),
  )
  .describe("Telegram subscription schema");

export type SubscriptionDto = Prettify<z.infer<typeof SubscriptionSchema>>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const InvoiceSchema = z
  .intersection(
    PaymentObjectSchema,
    z.object({
      chat_id: TgChatId,
      message_thread_id: z.optional(TgMessageThreadId), // Forum thread id
    }),
  )
  .describe("Telegram invoice schema");

export type InvoiceDto = Prettify<z.infer<typeof InvoiceSchema>>;

const TgPhotoSchema = z
  .object({
    url: z.string(),
    height: z.number(),
    width: z.number(),
  })
  .describe("Telegram photo object schema");

export type TgPhotoDto = Prettify<z.infer<typeof TgPhotoSchema>>;

const TgPaymentBaseSchema = z
  .intersection(
    LabeledPriceSchema,
    z.object({
      title: z.string(),
      description: z.string(),
      payload: z.string(),
      photo: TgPhotoSchema,
      meta: z.string(),
    }),
  )
  .describe("Telegram payment base dto");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TgInvoiceSchema = z
  .intersection(
    TgPaymentBaseSchema,
    z.object({
      chatId: TgChatId,
      token: z.string(),
      forumThreadId: z.optional(TgMessageThreadId),
    }),
  )
  .describe("Telegram invoice schema");

export type TgInvoice = Prettify<z.infer<typeof TgInvoiceSchema>>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TgSubscriptionSchema = z
  .intersection(
    TgPaymentBaseSchema,
    z.object({
      subscriptionPeriod: z.number(),
    }),
  )
  .describe("Telegram subscription dto");

export type TgSubscription = Prettify<z.infer<typeof TgSubscriptionSchema>>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PreCheckoutQuerySchema = z
  .object({
    pre_checkout_query_id: z.string(),
    ok: z.boolean(),
    error_message: z.optional(z.string()),
  })
  .describe("Telegram pre-checkout query schema");

export type PreCheckoutQueryDto = z.infer<typeof PreCheckoutQuerySchema>;
