import { BotCommand, BotMessageModel } from "./types";
import { telegramBotName } from "../env";
import { TgChatType, TgMessage } from "./api/types";
import { LanguageCode } from "../recognition/types";

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
  if (!msg) {
    return false;
  }

  const data = msg.voice || msg.audio;

  if (!data) {
    return false;
  }

  if (!data.duration || typeof data.duration !== "number") {
    return false;
  }

  const mimeType = data.mime_type || "";
  const isAudioSupported = ["audio/ogg", "audio/opus"].includes(
    mimeType.toLowerCase()
  );
  return isAudioSupported;
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
  if (!msg) {
    return "";
  }

  const data = msg.voice || msg.audio;

  if (!data) {
    return "";
  }

  return data.file_id || "";
}

export function getVoiceDuration(msg: TgMessage): number {
  if (!msg) {
    return 0;
  }

  const data = msg.voice || msg.audio;

  if (!data) {
    return 0;
  }

  return data.duration || 0;
}

export function getUserLanguage(msg: TgMessage): LanguageCode {
  const msgLang = (msg.from && msg.from.language_code) || "";
  const globalPart = msgLang.slice(0, 2).toLowerCase();

  if (globalPart === "ru") {
    return LanguageCode.Ru;
  }

  return LanguageCode.En;
}
