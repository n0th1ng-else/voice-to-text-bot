import { z } from "zod";
import type { Prettify } from "../../../../common/types.js";
import {
  TgChatId,
  TgMessageThreadId,
  TgPaymentChargeId,
  TgUserId,
} from "../../core.js";

export const TgAnswerPreCheckoutQuerySchema = z
  .boolean()
  .describe("Telegram answer pre checkout query schema");

export const TgRefundStarPaymentSchema = z
  .boolean()
  .describe("Telegram refund star payment schema");

export const TgEditUserStarSubscriptionSchema = z
  .boolean()
  .describe("Telegram edit user star subscription schema");

export const TgSubscriptionUrlSchema = z
  .string()
  .describe("Telegram subscription url result schema");

export const TgCurrencySchema = z
  .union([
    z.literal("EUR").describe("Euro"),
    z.literal("XTR").describe("Stars"),
  ])
  .describe("Telegram currency schema");

export type Currency = Prettify<z.infer<typeof TgCurrencySchema>>;

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
      subscription_expiration_date: z.optional(z.number()),
      is_recurring: z.optional(z.boolean()),
      is_first_recurring: z.optional(z.boolean()),
      telegram_payment_charge_id: TgPaymentChargeId,
      provider_payment_charge_id: z.string(),
    }),
  )
  .describe("[SuccessfulPayment] Telegram successful payment schema validator");

export const TgRefundedPaymentSchema = z
  .intersection(
    TgPaymentSchema,
    z.object({
      telegram_payment_charge_id: TgPaymentChargeId,
      provider_payment_charge_id: z.optional(z.string()),
    }),
  )
  .describe("[RefundedPayment] Telegram refunded payment schema validator");

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
    provider_token: z.optional(z.string()), // Provider token, empty when using stars
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
      currency: TgCurrencySchema,
      chatId: TgChatId,
      token: z.optional(z.string()),
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

const TgBasePaymentSchema = z
  .object({
    user_id: TgUserId,
    telegram_payment_charge_id: TgPaymentChargeId,
  })
  .describe("Base payment pair: userId and paymentId");

export type BasePaymentSchema = z.infer<typeof TgBasePaymentSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TgEditStarSubscriptionSchema = z
  .intersection(
    TgBasePaymentSchema,
    z.object({
      is_canceled: z.boolean(),
    }),
  )
  .describe("Telegram edit subscription parameters");

export type EditUserStarSubscriptionDto = Prettify<
  z.infer<typeof TgEditStarSubscriptionSchema>
>;
