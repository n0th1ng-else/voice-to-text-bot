import TelegramBot from "node-telegram-bot-api";
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

  constructor(msg: TelegramBot.Message) {
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
  options?: TelegramBot.SendMessageOptions;
}
