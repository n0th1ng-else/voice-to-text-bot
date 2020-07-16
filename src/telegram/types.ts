import {
  getChatId,
  getFullUserName,
  getGroupName,
  getUserName,
  getVoiceDuration,
  getVoiceFile,
  isChatGroup,
} from "./helpers";
import { LanguageCode } from "../recognition/types";
import { nanoid } from "nanoid";
import { Logger } from "../logger";
import { LabelId } from "../text/labels";
import { TextModel } from "../text";
import { TgInlineKeyboardButton, TgMessage } from "./api/types";

export enum BotCommand {
  Start = "/start",
  Language = "/lang",
  Support = "/support",
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

  constructor(msg: TgMessage) {
    this.id = msg.message_id;
    this.chatId = getChatId(msg);
    this.isGroup = isChatGroup(msg);
    this.userName = getUserName(msg);
    this.fullUserName = getFullUserName(msg);
    this.groupName = getGroupName(msg);
    this.voiceFileId = getVoiceFile(msg);
    this.voiceDuration = getVoiceDuration(msg);
  }

  public get name(): string {
    return this.isGroup ? this.groupName : this.userName;
  }
}

export interface MessageOptions {
  lang: LanguageCode;
  options?: TgInlineKeyboardButton[][];
}

export interface BotButtonData {
  l: LanguageCode;
  i: string;
}

export class TelegramMessagePrefix {
  constructor(
    public readonly chatId: number,
    public readonly id = nanoid(10)
  ) {}

  public getPrefix(): string {
    return `[Id=${Logger.y(this.id)}] [ChatId=${Logger.y(this.chatId)}]`;
  }

  public getDto(langId: LanguageCode): BotButtonData {
    return {
      l: langId,
      i: this.id,
    };
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

  constructor(public readonly command: BotCommand, textId: LabelId) {
    const textLib = new TextModel();
    this.description = textLib.t(textId, LanguageCode.En);
  }
}
