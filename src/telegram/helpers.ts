import { BotCommand, BotMessageModel } from "./types";
import { telegramBotName } from "../env";
import { TgChatType, TgMessage } from "./api/types";

export function isLangMessage(model: BotMessageModel, msg: TgMessage): boolean {
  return isCommandMessage(model, msg, BotCommand.Language);
}

export function isHelloMessage(
  model: BotMessageModel,
  msg: TgMessage
): boolean {
  return isCommandMessage(model, msg, BotCommand.Start);
}

export function isSupportMessage(
  model: BotMessageModel,
  msg: TgMessage
): boolean {
  return isCommandMessage(model, msg, BotCommand.Support);
}

function isCommandMessage(
  model: BotMessageModel,
  msg: TgMessage,
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

export function isVoiceMessage(msg: TgMessage): boolean {
  return msg && !!msg.voice;
}

export function isMessageSupported(msg: TgMessage): boolean {
  const isBot = !!(msg.from && msg.from.is_bot);
  return !isBot;
}

export function getChatId(msg: TgMessage): number {
  return msg.chat.id;
}

export function isChatGroup(msg: TgMessage): boolean {
  return msg.chat.type !== TgChatType.Private;
}

export function getUserName(msg: TgMessage): string {
  const fromUserName = msg.from && msg.from.username;
  return fromUserName || getFullUserName(msg) || getGroupName(msg) || "";
}

export function getFullUserName(msg: TgMessage): string {
  const fromUserFullName =
    msg.from &&
    [msg.from.first_name, msg.from.last_name].filter((k) => k).join(" ");

  return fromUserFullName || "";
}

export function getGroupName(msg: TgMessage): string {
  const chatName = msg.chat.title;
  const chatFullName = [msg.chat.first_name, msg.chat.last_name]
    .filter((k) => k)
    .join(" ");
  return chatName || chatFullName || "";
}

export function getVoiceFile(msg: TgMessage): string {
  return msg.voice ? msg.voice.file_id : "";
}

export function getVoiceDuration(msg: TgMessage): number {
  return msg.voice ? msg.voice.duration : 0;
}
