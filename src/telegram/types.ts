import TelegramBot from "node-telegram-bot-api";
import {
  getChatId,
  getUserId,
  getVoiceDuration,
  getVoiceFile,
  isChatGroup,
  isMessageSupported,
} from "./helpers";

export enum BotCommand {
  Start = "/start",
  Language = "/lang",
  Support = "/support",
}

export class BotMessageModel {
  public readonly chatId: number;
  public readonly isGroup: boolean;
  public readonly username: string;
  public readonly voiceFileId: string;
  public readonly voiceDuration: number;
  public readonly isMessageSupported: boolean;

  constructor(msg: TelegramBot.Message) {
    this.chatId = getChatId(msg);
    this.isGroup = isChatGroup(msg);
    this.username = getUserId(msg);
    this.voiceFileId = getVoiceFile(msg);
    this.voiceDuration = getVoiceDuration(msg);
    this.isMessageSupported = isMessageSupported(msg);
  }
}
