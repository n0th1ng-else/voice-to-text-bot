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
} from "./helpers.js";
import { Logger } from "../logger/index.js";
import { getTranslator } from "../text/index.js";
import { type TgMessage, type TgMessageOptions } from "./api/types.js";
import { type AnalyticsData } from "../analytics/ga/types.js";
import type { LanguageCode } from "../recognition/types.js";

export enum VoiceContentReason {
  Ok = "Ok",
  NoContent = "NoContent",
  NoDuration = "NoDuration",
  WrongMimeType = "WrongMimeType",
}

export class VoiceContentReasonModel {
  constructor(
    public readonly type: VoiceContentReason,
    public readonly info?: string | number,
  ) {}
}

export enum BotCommand {
  Start = "/start",
  Language = "/lang",
  Support = "/support",
  Donate = "/donate",
}

export class BotMessageModel {
  public readonly id: number;
  public readonly chatId: number;
  public readonly isGroup: boolean;
  public readonly userName: string;
  public readonly fullUserName: string;
  public readonly groupName: string;
  public readonly voiceFileId: string;
  public readonly voiceDuration: number;
  public readonly isVideo: boolean;
  public readonly userLanguage: LanguageCode;
  public readonly analytics: AnalyticsData;
  public readonly donationId: number;
  public readonly forumThreadId?: number;

  constructor(msg: TgMessage, analytics: AnalyticsData) {
    this.id = msg.message_id;
    this.chatId = getChatId(msg);
    this.isGroup = isChatGroup(msg);
    this.userName = getUserName(msg);
    this.fullUserName = getFullUserName(msg);
    this.groupName = getGroupName(msg);
    this.voiceFileId = getVoiceFile(msg);
    this.voiceDuration = getVoiceDuration(msg);
    this.isVideo = isVideoMessage(msg);
    this.userLanguage = getUserLanguage(msg);
    this.donationId = parseDonationPayload(
      msg.successful_payment?.invoice_payload,
    ).donationId;
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
  constructor(
    public readonly chatId: number,
    public readonly id = nanoid(10),
  ) {}

  public getPrefix(): string {
    return `[Id=${Logger.y(this.id)}] [ChatId=${Logger.y(this.chatId)}]`;
  }
}

export class BotLangData {
  constructor(
    public readonly langId: LanguageCode,
    public readonly prefix: TelegramMessagePrefix,
  ) {}
}

export class BotCommandOption {
  public readonly description: string;

  constructor(public readonly command: BotCommand) {
    const translator = getTranslator();
    this.description = translator.menu(command);
  }
}

const TelegramButtonTypeSchema = z
  .union([z.literal("d"), z.literal("l"), z.literal("u")])
  .describe("Button type schema. d is Donation, l is Language, u is Unknown");

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

  constructor(
    public readonly id: TelegramButtonType,
    public readonly value: V,
    public readonly logPrefix: string,
  ) {}

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
  chatId: number;
  prefix: string;
};

export const DonationSchema = z
  .object({
    d: z.number(),
    c: z.number(),
    l: z.string(),
  })
  .describe(
    "Donation schema used in Telegram callback. d is DonationId, c is ChatId, l is Log prefix",
  );

export type DonationDto = z.infer<typeof DonationSchema>;
