import {
  type ChatType,
  type PaymentInvoiceDto,
  type PaymentPayload,
  PaymentInvoiceSchema,
  VoiceContentReason,
  VoiceContentReasonModel,
  type VoiceType,
} from "./types.js";
import { type TgCallbackQuery, type TgMessage } from "./api/types.js";
import { DEFAULT_LANGUAGE, type LanguageCode, LanguageSchema } from "../recognition/types.js";
import { BOT_LOGO, supportedAudioFormats } from "../const.js";
import { convertLanguageCodeFromISO } from "../recognition/common.js";
import { type TgMedia } from "./api/groups/chats/chats-types.js";
import type { Currency, TgPhotoDto } from "./api/groups/payments/payments-types.js";
import type { ChatId, FileId } from "./api/core.js";

export const getVoiceType = (msg: TgMessage): VoiceType => {
  if (msg.video_note) {
    return "video_note";
  }

  if (msg.audio) {
    return "audio";
  }

  if (msg.voice) {
    return "voice_note";
  }

  return "unknown";
};

const getMediaSource = (msg: TgMessage): TgMedia | undefined =>
  msg.voice || msg.audio || msg.video_note;

export const isVoiceMessage = (msg: TgMessage): VoiceContentReasonModel => {
  if (!msg) {
    return new VoiceContentReasonModel(VoiceContentReason.NoContent);
  }

  const data = getMediaSource(msg);

  if (!data) {
    return new VoiceContentReasonModel(VoiceContentReason.NoContent);
  }

  if (typeof data.duration !== "number" || data.duration < 0) {
    return new VoiceContentReasonModel(VoiceContentReason.NoDuration, data.duration);
  }

  const mimeType = data.mime_type || "";
  const isVideo = getVoiceType(msg) === "video_note";

  const formats = supportedAudioFormats.reduce(
    (union, format) => union.add(format.mimeType.toLowerCase()),
    new Set<string>(),
  );

  const isAudioSupported = formats.has(mimeType.toLowerCase());

  return isAudioSupported || isVideo
    ? new VoiceContentReasonModel(VoiceContentReason.Ok)
    : new VoiceContentReasonModel(VoiceContentReason.WrongMimeType, data.mime_type);
};

export const isMessageSupported = (msg: TgMessage): boolean => {
  const isBot = Boolean(msg.from?.is_bot);
  return !isBot;
};

export const getChatId = (msg: TgMessage): ChatId => msg.chat.id;

export const isChatGroup = (msg: TgMessage): boolean => msg.chat.type !== "private";

export const getChatType = (msg: TgMessage): ChatType => {
  if (msg.is_topic_message && msg.message_thread_id) {
    return "forum";
  }

  return msg.chat.type;
};

export const getUserName = (msg: TgMessage): string => {
  const fromUserName = msg.from?.username;
  return fromUserName || getFullUserName(msg) || getGroupName(msg) || "";
};

export const getFullUserName = (msg: TgMessage): string => {
  const fromUserFullName =
    msg.from && [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ");

  return fromUserFullName || "";
};

export const getGroupName = (msg: TgMessage): string => {
  const chatName = msg.chat.title;
  const chatFullName = [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(" ");
  return chatName || chatFullName || "";
};

export const getVoiceFile = (msg: TgMessage): FileId | undefined => {
  if (!msg) {
    return;
  }

  const data = getMediaSource(msg);

  if (!data) {
    return;
  }

  return data.file_id;
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

  try {
    const lang = convertLanguageCodeFromISO(globalPart);
    return lang;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

export const getRawUserLanguage = (msg: TgMessage | TgCallbackQuery): string => {
  return msg.from?.language_code || "";
};

export const getLanguageByText = (lang: string, throwOnError = false): LanguageCode => {
  try {
    const lng = LanguageSchema.parse(lang);
    return lng;
  } catch (err) {
    if (!throwOnError) {
      return DEFAULT_LANGUAGE;
    }

    throw new Error(`Language code ${lang} is not recognized`, { cause: err });
  }
};

export const getPaymentInvoiceData = (
  paymentInternalId: string,
  chatId: ChatId,
  logPrefix: string,
): string => {
  const dto: PaymentInvoiceDto = {
    id: String(paymentInternalId),
    c: chatId,
    l: logPrefix,
  };

  return JSON.stringify(dto);
};

export const parsePaymentPayload = (dtoString = ""): PaymentPayload => {
  try {
    const obj = PaymentInvoiceSchema.parse(JSON.parse(dtoString));
    return {
      paymentInternalId: obj.d ? String(obj.d) || "" : obj.id || "",
      chatId: obj.c,
      prefix: obj.l,
    };
  } catch {
    return {
      paymentInternalId: "",
      // TODO dangerous, why do I need to fallback on something?
      chatId: 0 as ChatId,
      prefix: "",
    };
  }
};

export const getBotLogo = (): TgPhotoDto => {
  return {
    url: BOT_LOGO,
    width: 1024,
    height: 1024,
  };
};

export const isStars = (currency: Currency): boolean => {
  return currency === "XTR";
};
