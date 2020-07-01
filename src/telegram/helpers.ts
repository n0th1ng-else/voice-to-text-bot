import TelegramBot from "node-telegram-bot-api";
import { BotCommand, BotMessageModel } from "./types";
import { telegramBotName } from "../env";

export function isLangMessage(
  model: BotMessageModel,
  msg: TelegramBot.Message
): boolean {
  return isCommandMessage(model, msg, BotCommand.Language);
}

export function isHelloMessage(
  model: BotMessageModel,
  msg: TelegramBot.Message
): boolean {
  return isCommandMessage(model, msg, BotCommand.Start);
}

export function isSupportMessage(
  model: BotMessageModel,
  msg: TelegramBot.Message
): boolean {
  return isCommandMessage(model, msg, BotCommand.Support);
}

function isCommandMessage(
  model: BotMessageModel,
  msg: TelegramBot.Message,
  command: BotCommand
): boolean {
  if (!msg || !msg.text) {
    return false;
  }

  if (msg.text === command) {
    return true;
  }

  if (!telegramBotName) {
    return false;
  }

  return (
    model.isGroup &&
    msg.text.toLowerCase() === `${command}@${telegramBotName.toLowerCase()}`
  );
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
  return !isBot;
}

export function getChatId(msg: TelegramBot.Message): number {
  return msg.chat.id;
}

export function isChatGroup(msg: TelegramBot.Message): boolean {
  return msg.chat.type !== "private";
}

export function getUserName(msg: TelegramBot.Message): string {
  const fromUserName = msg.from && msg.from.username;
  return fromUserName || getFullUserName(msg) || getGroupName(msg) || "";
}

export function getFullUserName(msg: TelegramBot.Message): string {
  const fromUserFullName =
    msg.from &&
    [msg.from.first_name, msg.from.last_name].filter((k) => k).join(" ");

  return fromUserFullName || "";
}

export function getGroupName(msg: TelegramBot.Message): string {
  const chatName = msg.chat.title;
  const chatFullName = [msg.chat.first_name, msg.chat.last_name]
    .filter((k) => k)
    .join(" ");
  return chatName || chatFullName || "";
}

export function getVoiceFile(msg: TelegramBot.Message): string {
  return msg.voice ? msg.voice.file_id : "";
}

export function getVoiceDuration(msg: TelegramBot.Message): number {
  return msg.voice ? msg.voice.duration : 0;
}
