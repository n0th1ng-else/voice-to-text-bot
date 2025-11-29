import { type TelegramBaseApi } from "../core.js";
import { type TgMessage, TgMessageSchema } from "../../types.js";
import {
  type BasePaymentSchema,
  type EditUserStarSubscriptionDto,
  type InvoiceDto,
  type PreCheckoutQueryDto,
  type SubscriptionDto,
  TgAnswerPreCheckoutQuerySchema,
  TgEditUserStarSubscriptionSchema,
  type TgInvoice,
  TgRefundStarPaymentSchema,
  type TgSubscription,
  TgSubscriptionUrlSchema,
} from "./payments-types.js";
import type { ChatId, PaymentChargeId, UserId } from "../../core.js";

export class TelegramPaymentsApi {
  private readonly client: TelegramBaseApi;

  constructor(client: TelegramBaseApi) {
    this.client = client;
  }

  public sendInvoice(opts: TgInvoice): Promise<TgMessage> {
    const data: InvoiceDto = {
      chat_id: opts.chatId,
      currency: opts.currency,
      title: opts.title,
      description: opts.description,
      payload: opts.payload,
      prices: [
        {
          label: opts.label,
          amount: opts.amount,
        },
      ],
      provider_token: opts.token,
      start_parameter: opts.meta,
      photo_url: opts.photo.url,
      photo_width: opts.photo.width,
      photo_height: opts.photo.height,
    };

    if (opts.forumThreadId) {
      data.message_thread_id = opts.forumThreadId;
    }

    return this.client.requestValidate("sendInvoice", TgMessageSchema, data, opts.chatId);
  }

  public createInvoiceLink(chatId: ChatId, opts: TgSubscription): Promise<string> {
    const data: SubscriptionDto = {
      title: opts.title,
      description: opts.description,
      payload: opts.payload,
      provider_token: "", // Empty if using Stars
      currency: "XTR",
      prices: [
        {
          label: opts.label,
          amount: opts.amount,
        },
      ],
      subscription_period: opts.subscriptionPeriod, //2592000, // Only support 30 days
      photo_url: opts.photo.url,
      photo_width: opts.photo.width,
      photo_height: opts.photo.height,
      start_parameter: opts.meta,
    };
    return this.client.requestValidate("createInvoiceLink", TgSubscriptionUrlSchema, data, chatId);
  }

  public refundStarPayment(
    chatId: ChatId,
    userId: UserId,
    paymentChargeId: PaymentChargeId,
  ): Promise<boolean> {
    const data: BasePaymentSchema = {
      user_id: userId,
      telegram_payment_charge_id: paymentChargeId,
    };
    return this.client.requestValidate(
      "refundStarPayment",
      TgRefundStarPaymentSchema,
      data,
      chatId,
    );
  }

  /**
   * Cancel or re-enable subscription
   */
  public editUserStarSubscription(
    chatId: ChatId,
    userId: UserId,
    paymentChargeId: PaymentChargeId,
    isCanceled: boolean,
  ): Promise<boolean> {
    const data: EditUserStarSubscriptionDto = {
      user_id: userId,
      telegram_payment_charge_id: paymentChargeId,
      is_canceled: isCanceled,
    };
    return this.client.requestValidate(
      "editUserStarSubscription",
      TgEditUserStarSubscriptionSchema,
      data,
      chatId,
    );
  }

  public answerPreCheckoutQuery(chatId: ChatId, queryId: string, error?: string): Promise<boolean> {
    const data: PreCheckoutQueryDto = {
      pre_checkout_query_id: queryId,
      ok: !error,
      error_message: error,
    };
    return this.client.requestValidate(
      "answerPreCheckoutQuery",
      TgAnswerPreCheckoutQuerySchema,
      data,
      chatId,
    );
  }
}
