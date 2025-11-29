import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { TranslationKeys } from "../src/text/types.js";
import { randomIntFromInterval } from "../src/common/timer.js";
import { TelegramButtonModel, type TelegramButtonType } from "../src/telegram/types.js";
import { donationLevels } from "../src/const.js";
import { toCurrency } from "../src/text/utils.js";
import type { TgCallbackQuery, TgMessage } from "../src/telegram/api/types.js";
import type { LanguageCode } from "../src/recognition/types.js";
import type { SupportedEnvironment } from "../src/recognition/index.js";
import type { ValueOf } from "../src/common/types.js";
import type { TgChatType } from "../src/telegram/api/groups/chats/chats-types.js";
import type { ChatId, FileId, MessageId } from "../src/telegram/api/core.js";
import type { Currency } from "../src/telegram/api/groups/payments/payments-types.js";
import {
  asCallbackQueryId__test,
  asMessageId__test,
  asUserId__test,
} from "../src/testUtils/types.js";
import type { UsageId } from "../src/db/sql/types.js";

type UserNameOptions = {
  userName?: string;
  firstName?: string;
  lastName?: string;
};

export class TelegramMessageModel {
  public messageId: MessageId = asMessageId__test(0);
  public voiceId?: FileId;
  public readonly chatId: ChatId;
  public readonly chatType: TgChatType;

  private text = "";
  private voiceDuration = 0;
  private callbackData = "";
  private isBot = false;
  private hasFrom = false;
  private firstName = "";
  private lastName = "";
  private userName = "";
  private userLanguage = "";
  private contentType: "voice" | "audio" | "video_note" = "voice";
  private mimeType = "";

  constructor(chatId: ChatId, chatType: TgChatType) {
    this.chatId = chatId;
    this.chatType = chatType;
  }

  public setName(messageId: MessageId, options: UserNameOptions, isBot = false, lang = ""): this {
    this.messageId = messageId;
    this.isBot = isBot;
    this.hasFrom = true;
    this.firstName = options.firstName || "";
    this.lastName = options.lastName || "";
    this.userName = options.userName || "";
    this.userLanguage = lang;
    return this;
  }

  public setText(messageId: MessageId, text: string): this {
    this.messageId = messageId;
    this.text = text;
    return this;
  }

  public setVoice(messageId: MessageId, id: FileId, duration: number, type = "audio/ogg"): this {
    this.messageId = messageId;
    this.voiceId = id;
    this.voiceDuration = duration;
    this.mimeType = type;
    return this;
  }

  public setAudio(messageId: MessageId, id: FileId, duration: number, type = "audio/opus"): this {
    this.messageId = messageId;
    this.voiceId = id;
    this.voiceDuration = duration;
    this.mimeType = type;
    this.contentType = "audio";
    return this;
  }

  public setVideoNote(
    messageId: MessageId,
    id: FileId,
    duration: number,
    type = "audio/mpeg",
  ): this {
    this.messageId = messageId;
    this.voiceId = id;
    this.voiceDuration = duration;
    this.mimeType = type;
    this.contentType = "video_note";
    return this;
  }

  public setLangCallback(messageId: MessageId, langId: LanguageCode, prefixId: string): this {
    this.messageId = messageId;
    const data = new TelegramButtonModel<LanguageCode>("l", langId, prefixId);

    this.callbackData = data.getDtoString();
    return this;
  }

  public setDonateCallback(
    messageId: MessageId,
    price: number,
    currency: Currency,
    prefixId: string,
  ): this {
    this.messageId = messageId;
    const data = new TelegramButtonModel("d", JSON.stringify([price, currency]), prefixId);

    this.callbackData = data.getDtoString();
    return this;
  }

  public toApi(): TgMessage {
    return {
      text: this.text,
      message_id: this.messageId,
      date: new Date().getDate(),
      from: this.hasFrom
        ? {
            is_bot: this.isBot,
            id: asUserId__test(randomIntFromInterval(1, 100000)),
            first_name: this.firstName,
            last_name: this.lastName,
            username: this.userName,
            language_code: this.userLanguage,
          }
        : undefined,
      chat: {
        id: this.chatId,
        type: this.chatType,
      },
      voice:
        this.voiceId && this.contentType === "voice"
          ? {
              duration: this.voiceDuration,
              file_id: this.voiceId,
              mime_type: this.mimeType,
            }
          : undefined,
      audio:
        this.voiceId && this.contentType === "audio"
          ? {
              duration: this.voiceDuration,
              file_id: this.voiceId,
              mime_type: this.mimeType,
            }
          : undefined,
      video_note:
        this.voiceId && this.contentType === "video_note"
          ? {
              duration: this.voiceDuration,
              file_id: this.voiceId,
              mime_type: this.mimeType,
            }
          : undefined,
    };
  }

  public toCallbackApi(): TgCallbackQuery {
    return {
      data: this.callbackData,
      id: asCallbackQueryId__test(""),
      from: {
        is_bot: false,
        first_name: this.firstName,
        last_name: this.lastName,
        username: this.userName,
        id: asUserId__test(randomIntFromInterval(1, 100000)),
      },
      message: {
        text: this.text,
        date: new Date().getDate(),
        message_id: this.messageId,
        chat: {
          id: this.chatId,
          type: this.chatType,
        },
      },
    };
  }
}

export const TelegramMessageMetaType = {
  Button: 0,
  Link: 1,
} as const;

type TelegramMessageMeta = ValueOf<typeof TelegramMessageMetaType>;

export class TelegramMessageMetaItem {
  public readonly type: TelegramMessageMeta;
  public readonly title: string;
  public readonly data: string;
  public readonly btnType: TelegramButtonType;

  constructor(
    type: TelegramMessageMeta,
    title: string,
    data: string,
    btnType: TelegramButtonType = "d",
  ) {
    this.type = type;
    this.title = title;
    this.data = data;
    this.btnType = btnType;
  }
}

export class BotStatRecordModel {
  public objectId?: UsageId;
  public user = "";
  public usageCount = 0;
  public chatId: ChatId;
  public langId: LanguageCode;

  constructor(chatId: ChatId, langId: LanguageCode = "en-US") {
    this.chatId = chatId;
    this.langId = langId;
  }

  public setObjectId(objectId: UsageId): this {
    this.objectId = objectId;
    return this;
  }

  public setUserName(username: string): this {
    this.user = username;
    return this;
  }

  public setLang(lang: LanguageCode): this {
    this.langId = lang;
    return this;
  }
}

export const getMockCertificate = (): string => {
  const currentDir = fileURLToPath(new URL(".", import.meta.url));
  const path = resolvePath(currentDir, "mockData", "googleapps_mock.key");
  return readFileSync(path, { encoding: "utf-8" });
};

export const getDonateButtons = (): TelegramMessageMetaItem[][] => {
  const buttons: TelegramMessageMetaItem[][] = [];
  const starsButtons: TelegramMessageMetaItem[] = donationLevels.stars.map(
    (level) =>
      new TelegramMessageMetaItem(
        TelegramMessageMetaType.Button,
        `${level.amount} ${level.meta}`,
        JSON.stringify([level.amount, "XTR"]),
      ),
  );

  const eurosButtons: TelegramMessageMetaItem[] = donationLevels.euros.map(
    (level) =>
      new TelegramMessageMetaItem(
        TelegramMessageMetaType.Button,
        toCurrency(level.amount, level.meta),
        JSON.stringify([level.amount, "EUR"]),
      ),
  );

  buttons.push(starsButtons);
  buttons.push(eurosButtons);

  return buttons;
};

export const getLangButtons = (): TelegramMessageMetaItem[][] => {
  return [
    [
      new TelegramMessageMetaItem(
        TelegramMessageMetaType.Button,
        TranslationKeys.BtnEnglish,
        "en-US",
        "l",
      ),
    ],
    [
      new TelegramMessageMetaItem(
        TelegramMessageMetaType.Button,
        TranslationKeys.BtnRussian,
        "ru-RU",
        "l",
      ),
    ],
  ];
};

export const getConverterOptions = (): SupportedEnvironment => {
  return {
    elevenLabsKey: "11labs-token",
    wtiAiTokens: JSON.stringify([
      {
        locale: "en-US",
        token: "en-token",
      },
      {
        locale: "ru-RU",
        token: "ru-token",
      },
    ]),
    witAiApi: {
      tokens: {
        "en-US": "en-token",
        "ru-RU": "ru-token",
      },
    },
    googleApi: {
      privateKey: getMockCertificate(),
      projectId: "some-project",
      clientEmail: "some-email",
      isTestEnv: true,
    },
  };
};
