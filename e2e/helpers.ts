import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import type { LanguageCode } from "../src/recognition/types.js";
import { LabelId } from "../src/text/labels.js";
import { randomIntFromInterval } from "../src/common/timer.js";
import type {
  TgCallbackQuery,
  TgChatType,
  TgMessage,
} from "../src/telegram/api/types.js";
import {
  TelegramButtonModel,
  TelegramButtonType,
} from "../src/telegram/types.js";
import { donationLevels } from "../src/const.js";
import { TextModel } from "../src/text/index.js";

interface UserNameOptions {
  userName?: string;
  firstName?: string;
  lastName?: string;
}

export class TelegramMessageModel {
  public messageId = 0;
  public voiceId = "";
  private text = "";
  private voiceDuration = 0;
  private callbackData = "";
  private isBot = false;
  private hasFrom = false;
  private firstName = "";
  private lastName = "";
  private userName = "";
  private userLanguage = "";
  private isAudio = false;
  private mimeType = "";

  constructor(
    public readonly chatId: number,
    public readonly chatType: TgChatType
  ) {}

  public setName(
    messageId: number,
    options: UserNameOptions,
    isBot = false,
    lang = ""
  ): this {
    this.messageId = messageId;
    this.isBot = isBot;
    this.hasFrom = true;
    this.firstName = options.firstName || "";
    this.lastName = options.lastName || "";
    this.userName = options.userName || "";
    this.userLanguage = lang;
    return this;
  }

  public setText(messageId: number, text: string): this {
    this.messageId = messageId;
    this.text = text;
    return this;
  }

  public setVoice(
    messageId: number,
    id: string,
    duration: number,
    type = "audio/ogg"
  ): this {
    this.messageId = messageId;
    this.voiceId = id;
    this.voiceDuration = duration;
    this.mimeType = type;
    return this;
  }

  public setAudio(
    messageId: number,
    id: string,
    duration: number,
    type = "audio/opus"
  ): this {
    this.messageId = messageId;
    this.voiceId = id;
    this.voiceDuration = duration;
    this.mimeType = type;
    this.isAudio = true;
    return this;
  }

  public setLangCallback(
    messageId: number,
    langId: LanguageCode,
    prefixId: string
  ): this {
    this.messageId = messageId;
    const data = new TelegramButtonModel<LanguageCode>("l", langId, prefixId);

    this.callbackData = data.getDtoString();
    return this;
  }

  public setFundCallback(
    messageId: number,
    price: number,
    prefixId: string
  ): this {
    this.messageId = messageId;
    const data = new TelegramButtonModel("d", String(price), prefixId);

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
            id: randomIntFromInterval(1, 100000),
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
        this.voiceId && !this.isAudio
          ? {
              duration: this.voiceDuration,
              file_id: this.voiceId,
              mime_type: this.mimeType,
            }
          : undefined,
      audio:
        this.voiceId && this.isAudio
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
      id: "",
      from: {
        is_bot: false,
        first_name: this.firstName,
        last_name: this.lastName,
        username: this.userName,
        id: randomIntFromInterval(1, 100000),
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

export enum TelegramMessageMetaType {
  Button,
  Link,
}

export class TelegramMessageMetaItem {
  constructor(
    public readonly type: TelegramMessageMetaType,
    public readonly title: LabelId | string,
    public readonly data: string,
    public readonly btnType: TelegramButtonType = "d"
  ) {}
}

export class BotStatRecordModel {
  public objectId?: string;
  public user = "";
  public usageCount = 0;

  constructor(public chatId: number, public langId: LanguageCode = "en-US") {}

  public setObjectId(objectId: number): this {
    this.objectId = String(objectId);
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

export const getFundButtons = (): TelegramMessageMetaItem[][] => {
  const buttons: TelegramMessageMetaItem[][] = [];
  const extendedButtons: TelegramMessageMetaItem[] = donationLevels.map(
    (level) =>
      new TelegramMessageMetaItem(
        TelegramMessageMetaType.Button,
        TextModel.toCurrency(level.amount, level.meta),
        String(level.amount)
      )
  );

  buttons.push(extendedButtons);

  return buttons;
};

export const getLangButtons = (): TelegramMessageMetaItem[][] => {
  return [
    [
      new TelegramMessageMetaItem(
        TelegramMessageMetaType.Button,
        LabelId.BtnRussian,
        "ru-RU",
        "l"
      ),
    ],
    [
      new TelegramMessageMetaItem(
        TelegramMessageMetaType.Button,
        LabelId.BtnEnglish,
        "en-US",
        "l"
      ),
    ],
  ];
};
