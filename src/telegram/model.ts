import type {
  ChatId,
  FileId,
  MessageId,
  MessageThreadId,
  PaymentChargeId,
  UserId,
} from "./api/core.js";
import type { LanguageCode } from "../recognition/types.js";
import type { AnalyticsData } from "../analytics/ga/types.js";
import type { TgMessage } from "./api/types.js";
import {
  getChatId,
  getFullUserName,
  getGroupName,
  getRawUserLanguage,
  getUserLanguage,
  getUserName,
  getVoiceDuration,
  getVoiceFile,
  isChatGroup,
  isVideoMessage,
  parseDonationPayload,
} from "./helpers.js";

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
  public readonly isVideo: boolean;
  public readonly userLanguage: LanguageCode;
  public readonly analytics: AnalyticsData;
  public readonly donationId: number;
  public readonly paymentChargeId?: PaymentChargeId;
  public readonly isSubscriptionPayment: boolean;
  public readonly forumThreadId?: MessageThreadId;

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
    this.isVideo = isVideoMessage(msg);
    this.userLanguage = getUserLanguage(msg);
    this.donationId = parseDonationPayload(
      msg.successful_payment?.invoice_payload,
    ).donationId;
    this.paymentChargeId = msg.successful_payment?.telegram_payment_charge_id;
    this.isSubscriptionPayment = msg.successful_payment?.is_recurring ?? false;
    if (msg.is_topic_message && msg.message_thread_id) {
      this.forumThreadId = msg.message_thread_id;
    }
    this.analytics = analytics
      .setId(this.chatId)
      .setLang(getRawUserLanguage(msg));
  }

  public get name(): string {
    return this.isGroup ? this.groupName : this.userName;
  }
}
