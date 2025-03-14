import { type TelegramBaseApi } from "../core.js";
import { type TgMessage } from "../../types.js";
import {
  type InvoiceDto,
  type PreCheckoutQueryDto,
  type SubscriptionDto,
  type TgInvoice,
  type TgSubscription,
  TgSubscriptionChangeSchema,
  TgSubscriptionUrlSchema,
} from "./payments-types.js";
import type { ChatId } from "../../core.js";

export class TelegramPaymentsApi {
  private readonly client: TelegramBaseApi;

  constructor(client: TelegramBaseApi) {
    this.client = client;
  }

  public sendInvoice(opts: TgInvoice): Promise<TgMessage> {
    const data: InvoiceDto = {
      chat_id: opts.chatId,
      currency: "EUR",
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

    return this.client.request<TgMessage, InvoiceDto>(
      "sendInvoice",
      data,
      opts.chatId,
    );
  }

  public createInvoiceLink(
    chatId: ChatId,
    opts: TgSubscription,
  ): Promise<string> {
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
    return this.client.requestValidate(
      "createInvoiceLink",
      TgSubscriptionUrlSchema,
      data,
      chatId,
    );
  }

  public refundStarPayment(
    chatId: ChatId,
    userId: number,
    paymentChargeId: string,
  ): Promise<boolean> {
    const data = {
      user_id: userId,
      telegram_payment_charge_id: paymentChargeId,
    };
    return this.client.requestValidate(
      "refundStarPayment",
      TgSubscriptionChangeSchema,
      data,
      chatId,
    );
  }

  /**
   * Cancel or re-enable subscription
   */
  public editUserStarSubscription(
    chatId: ChatId,
    userId: number,
    paymentChargeId: string,
  ): Promise<boolean> {
    const data = {
      user_id: userId,
      telegram_payment_charge_id: paymentChargeId,
      is_canceled: true,
    };
    return this.client.requestValidate(
      "editUserStarSubscription",
      TgSubscriptionChangeSchema,
      data,
      chatId,
    );
  }

  public answerPreCheckoutQuery(
    queryId: string,
    error?: string,
  ): Promise<TgMessage> {
    const data: PreCheckoutQueryDto = {
      pre_checkout_query_id: queryId,
      ok: !error,
      error_message: error,
    };
    return this.client.request<TgMessage, PreCheckoutQueryDto>(
      "answerPreCheckoutQuery",
      data,
    );
  }
}
