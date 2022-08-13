import {
  getButtonTypeByText,
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
} from "./helpers";
import { LanguageCode } from "../recognition/types";
import { nanoid } from "nanoid";
import { Logger } from "../logger";
import { MenuLabel } from "../text/labels";
import { TextModel } from "../text";
import { TgInlineKeyboardButton, TgMessage } from "./api/types";
import { AnalyticsData } from "../analytics/legacy/types";

export enum VoiceContentReason {
  Ok = "Ok",
  NoContent = "NoContent",
  NoDuration = "NoDuration",
  WrongMimeType = "WrongMimeType",
}

export class VoiceContentReasonModel {
  constructor(
    public readonly type: VoiceContentReason,
    public readonly info?: string | number
  ) {}
}

export enum BotCommand {
  Start = "/start",
  Language = "/lang",
  Support = "/support",
  Fund = "/fund",
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
      msg.successful_payment?.invoice_payload
    ).donationId;
    this.analytics = analytics
      .setId(this.chatId)
      .setLang(getRawUserLanguage(msg));
  }

  public get name(): string {
    return this.isGroup ? this.groupName : this.userName;
  }
}

export interface MessageOptions {
  lang: LanguageCode;
  options?: TgInlineKeyboardButton[][];
}

export class TelegramMessagePrefix {
  constructor(
    public readonly chatId: number,
    public readonly id = nanoid(10)
  ) {}

  public getPrefix(): string {
    return `[Id=${Logger.y(this.id)}] [ChatId=${Logger.y(this.chatId)}]`;
  }
}

export class BotLangData {
  constructor(
    public readonly langId: LanguageCode,
    public readonly prefix: TelegramMessagePrefix
  ) {}
}

export class BotCommandOption {
  public readonly description: string;

  constructor(public readonly command: BotCommand, textId: MenuLabel) {
    const textLib = new TextModel();
    this.description = textLib.menu(textId);
  }
}

export enum TelegramButtonType {
  Donation = "d",
  Language = "l",
  Unknown = "u",
}

export class TelegramButtonModel {
  public static fromDto(dtoString: string): TelegramButtonModel {
    const dto: BotButtonDto = JSON.parse(dtoString);
    const type = getButtonTypeByText(dto.i);
    return new TelegramButtonModel(type, dto.v, dto.l);
  }

  constructor(
    public readonly id: TelegramButtonType,
    public readonly value: string,
    public readonly logPrefix: string
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

interface BotButtonDto {
  i: string; // type Identifier
  l: string; // log prefix
  v: string; // value
}

export interface DonationPayload {
  donationId: number;
  chatId: number;
  prefix: string;
}

export interface DonationDto {
  d: number; // donationId
  c: number; // chatId
  l: string; // log prefix
}
