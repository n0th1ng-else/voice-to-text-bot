import {
  BotCommand,
  BotMessageModel,
  DonationDto,
  DonationPayload,
  TelegramButtonType,
  VoiceContentReason,
  VoiceContentReasonModel,
} from "./types";
import { telegramBotName } from "../env";
import { TgCallbackQuery, TgChatType, TgMedia, TgMessage } from "./api/types";
import { LanguageCode } from "../recognition/types";
import { durationLimitSec, supportedAudioFormats } from "../const";

export const isLangMessage = (
  model: BotMessageModel,
  msg: TgMessage
): boolean => isCommandMessage(model, msg, BotCommand.Language);

export const isHelloMessage = (
  model: BotMessageModel,
  msg: TgMessage
): boolean => isCommandMessage(model, msg, BotCommand.Start);

export const isSupportMessage = (
  model: BotMessageModel,
  msg: TgMessage
): boolean => isCommandMessage(model, msg, BotCommand.Support);

export const isFundMessage = (
  model: BotMessageModel,
  msg: TgMessage
): boolean => isCommandMessage(model, msg, BotCommand.Fund);

const isCommandMessage = (
  model: BotMessageModel,
  msg: TgMessage,
  command: BotCommand
): boolean => {
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
};

export const isVideoMessage = (msg: TgMessage): boolean =>
  Boolean(msg.video_note);

const getMediaSource = (msg: TgMessage): TgMedia | undefined =>
  msg.voice || msg.audio || msg.video_note;

export const isVoiceMessageLong = (model: BotMessageModel): boolean =>
  model.voiceDuration >= durationLimitSec;

export const isVoiceMessage = (msg: TgMessage): VoiceContentReasonModel => {
  if (!msg) {
    return new VoiceContentReasonModel(VoiceContentReason.NoContent);
  }

  const data = getMediaSource(msg);

  if (!data) {
    return new VoiceContentReasonModel(VoiceContentReason.NoContent);
  }

  if (typeof data.duration !== "number" || data.duration < 0) {
    return new VoiceContentReasonModel(
      VoiceContentReason.NoDuration,
      data.duration
    );
  }

  const mimeType = data.mime_type || "";
  const isVideo = isVideoMessage(msg);

  const formats = supportedAudioFormats.reduce(
    (union, format) => union.add(format.mimeType.toLowerCase()),
    new Set<string>()
  );

  const isAudioSupported = formats.has(mimeType.toLowerCase());

  return isAudioSupported || isVideo
    ? new VoiceContentReasonModel(VoiceContentReason.Ok)
    : new VoiceContentReasonModel(
        VoiceContentReason.WrongMimeType,
        data.mime_type
      );
};

export const isMessageSupported = (msg: TgMessage): boolean => {
  const isBot = Boolean(msg.from && msg.from.is_bot);
  return !isBot;
};

export const getChatId = (msg: TgMessage): number => msg.chat.id;

export const isChatGroup = (msg: TgMessage): boolean =>
  msg.chat.type !== TgChatType.Private;

export const getUserName = (msg: TgMessage): string => {
  const fromUserName = msg.from && msg.from.username;
  return fromUserName || getFullUserName(msg) || getGroupName(msg) || "";
};

export const getFullUserName = (msg: TgMessage): string => {
  const fromUserFullName =
    msg.from &&
    [msg.from.first_name, msg.from.last_name].filter((k) => k).join(" ");

  return fromUserFullName || "";
};

export const getGroupName = (msg: TgMessage): string => {
  const chatName = msg.chat.title;
  const chatFullName = [msg.chat.first_name, msg.chat.last_name]
    .filter((k) => k)
    .join(" ");
  return chatName || chatFullName || "";
};

export const getVoiceFile = (msg: TgMessage): string => {
  if (!msg) {
    return "";
  }

  const data = getMediaSource(msg);

  if (!data) {
    return "";
  }

  return data.file_id || "";
};

export const getVoiceDuration = (msg: TgMessage): number => {
  if (!msg) {
    return 0;
  }

  const data = getMediaSource(msg);

  if (!data) {
    return 0;
  }

  return data.duration || 0;
};

export const getUserLanguage = (msg: TgMessage): LanguageCode => {
  const msgLang = getRawUserLanguage(msg);
  const globalPart = msgLang.slice(0, 2).toLowerCase();

  if (globalPart === "ru") {
    return LanguageCode.Ru;
  }

  return LanguageCode.En;
};

export const getRawUserLanguage = (
  msg: TgMessage | TgCallbackQuery
): string => {
  return (msg.from && msg.from.language_code) || "";
};

export const getLanguageByText = (
  lang: string,
  throwOnError = false
): LanguageCode => {
  switch (lang) {
    case LanguageCode.Ru:
      return LanguageCode.Ru;
    case LanguageCode.En:
      return LanguageCode.En;
    default: {
      if (!throwOnError) {
        return LanguageCode.En;
      }

      throw new Error("Language code is not recognized");
    }
  }
};

export const getButtonTypeByText = (type: string): TelegramButtonType => {
  switch (type) {
    case TelegramButtonType.Donation:
      return TelegramButtonType.Donation;
    case TelegramButtonType.Language:
      return TelegramButtonType.Language;
    default:
      return TelegramButtonType.Unknown;
  }
};

export const getDonationDtoString = (
  donationId: number,
  chatId: number,
  logPrefix: string
): string => {
  const dto: DonationDto = {
    d: donationId,
    c: chatId,
    l: logPrefix,
  };

  return JSON.stringify(dto);
};

export const parseDonationPayload = (text = ""): DonationPayload => {
  try {
    const obj: DonationDto = JSON.parse(text);
    return {
      donationId: obj.d || 0,
      chatId: obj.c || 0,
      prefix: obj.l || "",
    };
  } catch (err) {
    return {
      donationId: 0,
      chatId: 0,
      prefix: "",
    };
  }
};
