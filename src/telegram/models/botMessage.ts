import type {
  ChatId,
  FileId,
  MessageId,
  MessageThreadId,
  PaymentChargeId,
  UserId,
} from "../api/core.js";
import type { LanguageCode } from "../../recognition/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";
import type { TgMessage } from "../api/types.js";
import {
  getChatId,
  getChatType,
  getFullUserName,
  getGroupName,
  getRawUserLanguage,
  getUserLanguage,
  getUserName,
  getVoiceDuration,
  getVoiceFile,
  isChatGroup,
  getVoiceType,
  parsePaymentPayload,
} from "../helpers.js";
import type { ChatType, VoiceType } from "../types.js";
import type { Currency } from "../api/groups/payments/payments-types.js";

export class BotMessageModel {
  public readonly id: MessageId;
  public readonly chatId: ChatId;
  public readonly userId?: UserId;
  public readonly isGroup: boolean;
  public readonly userName: string;
  public readonly fullUserName: string;
  public readonly groupName: string;
  public readonly voiceFileId?: FileId;
  public readonly voiceDuration: number;
  public readonly voiceType: VoiceType;
  public readonly userLanguage: LanguageCode;
  public readonly analytics: AnalyticsData;
  public readonly paymentInternalId: string;
  public readonly paymentChargeId?: PaymentChargeId;
  public readonly paymentAmount?: number;
  public readonly paymentCurrency?: Currency;
  public readonly paymentNextDate?: number;
  public readonly isSubscriptionPayment: boolean;
  public readonly forumThreadId?: MessageThreadId;
  public readonly chatType: ChatType;

  constructor(msg: TgMessage, analytics: AnalyticsData) {
    this.id = msg.message_id;
    this.chatId = getChatId(msg);
    this.isGroup = isChatGroup(msg);
    this.userName = getUserName(msg);
    this.userId = msg.from?.id;
    this.fullUserName = getFullUserName(msg);
    this.groupName = getGroupName(msg);
    this.voiceFileId = getVoiceFile(msg);
    this.voiceDuration = getVoiceDuration(msg);
    this.voiceType = getVoiceType(msg);
    this.userLanguage = getUserLanguage(msg);

    const payment = msg.successful_payment;
    const paymentPayload = parsePaymentPayload(payment?.invoice_payload);
    this.paymentInternalId = paymentPayload.paymentInternalId;
    this.paymentChargeId = payment?.telegram_payment_charge_id;
    this.isSubscriptionPayment = payment?.is_recurring ?? false;
    this.paymentAmount = payment?.total_amount;
    this.paymentCurrency = payment?.currency;
    const expirationDate = payment?.subscription_expiration_date;
    // Telegram returns date in seconds, we need milliseconds
    this.paymentNextDate = expirationDate ? expirationDate * 1000 : undefined;

    if (msg.is_topic_message && msg.message_thread_id) {
      this.forumThreadId = msg.message_thread_id;
    }
    this.chatType = getChatType(msg);
    this.analytics = analytics.setId(this.chatId).setLang(getRawUserLanguage(msg));
  }

  public get name(): string {
    return this.isGroup ? this.groupName : this.userName;
  }
}
