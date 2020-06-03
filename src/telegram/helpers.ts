import TelegramBot from "node-telegram-bot-api";
import { BotCommand, BotMessageModel } from "./types";
import { watchFile } from "fs";

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
  const isBot = !!(msg.from && msg.from.is_bot);
  const types: TelegramBot.ChatType[] = ["private", "group"];
  const isSupportedDialogType = types.includes(msg.chat.type);
  return isSupportedDialogType && !isBot;
}

export function getChatId(msg: TelegramBot.Message): number {
  return msg.chat.id;
}

export function isChatGroup(msg: TelegramBot.Message): boolean {
  return msg.chat.type === "group";
}

export function getUserId(msg: TelegramBot.Message): string {
  const fromUserName = msg.from && msg.from.username;
  const fromUserFullName =
    msg.from &&
    [msg.from.first_name, msg.from.last_name].filter((k) => k).join(" ");
  const chatName = msg.chat.username;
  const chatFullName = [msg.chat.first_name, msg.chat.last_name]
    .filter((k) => k)
    .join(" ");
  return fromUserName || fromUserFullName || chatName || chatFullName || "";
}

export function getVoiceFile(msg: TelegramBot.Message) {
  return msg.voice ? msg.voice.file_id : "";
}

export function getVoiceDuration(msg: TelegramBot.Message): number {
  return msg.voice ? msg.voice.duration : 0;
}
