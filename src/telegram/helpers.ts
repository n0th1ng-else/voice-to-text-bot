import TelegramBot from "node-telegram-bot-api";
import { BotCommand, BotMessageModel } from "./types";

export function isLangMessage(msg: TelegramBot.Message): boolean {
  return msg && msg.text === BotCommand.Language;
}

export function isHelloMessage(msg: TelegramBot.Message): boolean {
  return msg && msg.text === BotCommand.Start;
}

export function isSupportMessage(msg: TelegramBot.Message): boolean {
  return msg && msg.text === BotCommand.Support;
}

export function isVoiceMessageLong(model: BotMessageModel): boolean {
  const durationLimitSec = 59;
  return model.voiceDuration > durationLimitSec;
}

export function isVoiceMessage(msg: TelegramBot.Message): boolean {
  return msg && !!msg.voice;
}

export function isMessageSupported(msg: TelegramBot.Message): boolean {
  const types: TelegramBot.ChatType[] = ["private", "group"];
  return types.includes(msg.chat.type);
}

export function getChatId(msg: TelegramBot.Message): number {
  return msg.chat.id;
}

export function isChatGroup(msg: TelegramBot.Message): boolean {
  return msg.chat.type === "group";
}

export function getUserId(msg: TelegramBot.Message): string {
  if (msg.from && msg.from.username) {
    return msg.from.username;
  }
  return msg.chat.username || "";
}

export function getVoiceFile(msg: TelegramBot.Message) {
  return msg.voice ? msg.voice.file_id : "";
}

export function getVoiceDuration(msg: TelegramBot.Message): number {
  return msg.voice ? msg.voice.duration : 0;
}
