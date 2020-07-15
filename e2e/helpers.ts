import { readFileSync } from "fs";
import { resolve as resolvePath } from "path";
import { LanguageCode } from "../src/recognition/types";
import { LabelId } from "../src/text/labels";
import { UsageStatKey } from "../src/statistic/types";
import { randomIntFromInterval } from "../src/common/timer";
import { BotButtonData } from "../src/telegram/types";
import {
  TgCallbackQuery,
  TgChatType,
  TgMessage,
} from "../src/telegram/api/types";

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

  constructor(
    public readonly chatId: number,
    public readonly chatType: TgChatType
  ) {}

  public setName(
    messageId: number,
    options: UserNameOptions,
    isBot = false
  ): this {
    this.messageId = messageId;
    this.isBot = isBot;
    this.hasFrom = true;
    this.firstName = options.firstName || "";
    this.lastName = options.lastName || "";
    this.userName = options.userName || "";
    return this;
  }

  public setText(messageId: number, text: string): this {
    this.messageId = messageId;
    this.text = text;
    return this;
  }

  public setVoice(messageId: number, id: string, duration: number): this {
    this.messageId = messageId;
    this.voiceId = id;
    this.voiceDuration = duration;
    return this;
  }

  public setCallbackData(
    messageId: number,
    langId: LanguageCode,
    prefixId: string
  ): this {
    this.messageId = messageId;
    const data: BotButtonData = {
      l: langId,
      i: prefixId,
    };
    this.callbackData = JSON.stringify(data);
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
          }
        : undefined,
      chat: {
        id: this.chatId,
        type: this.chatType,
      },
      voice: this.voiceId
        ? {
            duration: this.voiceDuration,
            file_id: this.voiceId,
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
  constructor(public readonly title: LabelId, public readonly data: string) {}
}

export class TelegramMessageMeta {
  constructor(
    public readonly type: TelegramMessageMetaType,
    public readonly items: TelegramMessageMetaItem[]
  ) {}
}

export class BotStatRecordModel {
  public objectId?: string;
  public user = "";
  public usageCount = 0;

  constructor(public chatId: number, public langId = LanguageCode.En) {}

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

  public getDto(): Record<string, string | number | undefined> {
    return {
      objectId: this.objectId,
      [UsageStatKey.ChatId]: this.chatId,
      [UsageStatKey.LangId]: this.langId,
      [UsageStatKey.UsageCount]: this.usageCount,
      [UsageStatKey.UserName]: this.user,
    };
  }
}

export function getMockCertificate(): string {
  const path = resolvePath(__dirname, "mockData", "googleapps_mock.key");
  return readFileSync(path, { encoding: "utf-8" });
}
