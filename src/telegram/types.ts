import { z } from "zod";
import { nanoid } from "nanoid";
import {
  getChatId,
  parseDonationPayload,
  getFullUserName,
  getGroupName,
  getRawUserLanguage,
  getUserLanguage,
  getUserName,
  getVoiceDuration,
  getVoiceFile,
  isChatGroup,
  isVideoMessage,
} from "./helpers.js"; // TODO module cycle with ./types.ts
import { Logger } from "../logger/index.js";
import { getTranslator } from "../text/index.js";
import { type TgMessage } from "./api/types.js";
import { type AnalyticsData } from "../analytics/ga/types.js";
import type { LanguageCode } from "../recognition/types.js";
import type { ValueOf } from "../common/types.js";
import {
  type ChatId,
  type FileId,
  type MessageId,
  type MessageThreadId,
  type PaymentChargeId,
  TgChatId,
  type UserId,
} from "./api/core.js";
import type { TgMessageOptions } from "./api/groups/chats/chats-types.js";

export const VoiceContentReason = {
  Ok: "Ok",
  NoContent: "NoContent",
  NoDuration: "NoDuration",
  WrongMimeType: "WrongMimeType",
} as const;

export type VoiceContentReasonType = ValueOf<typeof VoiceContentReason>;

export class VoiceContentReasonModel {
  public readonly type: VoiceContentReasonType;
  public readonly info?: string | number;

  constructor(type: VoiceContentReasonType, info?: string | number) {
    this.type = type;
    this.info = info;
  }
}

export const BotCommand = {
  Start: "/start",
  Language: "/lang",
  Support: "/support",
  Donate: "/donate",
} as const;

export type BotCommandType = ValueOf<typeof BotCommand>;

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

export type MessageOptions = {
  lang: LanguageCode;
  options?: TgMessageOptions;
};

export class TelegramMessagePrefix {
  public readonly chatId: ChatId;
  public readonly id: string;

  constructor(chatId: ChatId, id = nanoid(10)) {
    this.chatId = chatId;
    this.id = id;
  }

  public getPrefix(): string {
    return `[Id=${Logger.y(this.id)}] [ChatId=${Logger.y(this.chatId)}]`;
  }
}

export class BotLangData {
  public readonly langId: LanguageCode;
  public readonly prefix: TelegramMessagePrefix;

  constructor(langId: LanguageCode, prefix: TelegramMessagePrefix) {
    this.langId = langId;
    this.prefix = prefix;
  }
}

export class BotCommandOption {
  public readonly description: string;
  public readonly command: BotCommandType;

  constructor(command: BotCommandType) {
    this.command = command;
    const translator = getTranslator();
    this.description = translator.menu(command);
  }
}

const TelegramButtonTypeSchema = z
  .union([
    z.literal("d").describe("Donation"),
    z.literal("l").describe("Language"),
    z.literal("u").describe("Unknown"),
  ])
  .describe("Button type schema");

export type TelegramButtonType = z.infer<typeof TelegramButtonTypeSchema>;

const ButtonSchema = z
  .object({
    i: TelegramButtonTypeSchema,
    l: z.string(),
    v: z.string(),
  })
  .describe(
    "Button schema used in Telegram callback. i is Button Type, l is Log prefix, v is Value",
  );

export type BotButtonDto = z.infer<typeof ButtonSchema>;

export class TelegramButtonModel<V extends string = string> {
  public static fromDto(dtoString: string): TelegramButtonModel {
    try {
      const obj = ButtonSchema.parse(JSON.parse(dtoString));
      return new TelegramButtonModel(obj.i, obj.v, obj.l);
    } catch {
      return new TelegramButtonModel("u", "", "");
    }
  }

  public readonly id: TelegramButtonType;
  public readonly value: V;
  public readonly logPrefix: string;

  constructor(id: TelegramButtonType, value: V, logPrefix: string) {
    this.id = id;
    this.value = value;
    this.logPrefix = logPrefix;
  }

  public getDtoString(): string {
    const dto: BotButtonDto = {
      i: this.id,
      l: this.logPrefix,
      v: this.value,
    };

    return JSON.stringify(dto);
  }
}

export type DonationPayload = {
  donationId: number;
  chatId: ChatId;
  prefix: string;
};

export const DonationSchema = z
  .object({
    d: z.number(),
    c: TgChatId,
    l: z.string(),
  })
  .describe(
    "Donation schema used in Telegram callback. d is DonationId, c is ChatId, l is Log prefix",
  );

export type DonationDto = z.infer<typeof DonationSchema>;
