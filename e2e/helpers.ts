import TelegramBot from "node-telegram-bot-api";
import { readFileSync } from "fs";
import { resolve as resolvePath } from "path";
import { LanguageCode } from "../src/recognition/types";
import { LabelId } from "../src/text/labels";
import { UsageStatKey } from "../src/statistic/types";

export class TelegramMessageModel {
  public messageId = 0;
  public voiceId = "";
  private text = "";
  private voiceDuration = 0;

  constructor(
    public readonly chatId: number,
    public readonly chatType: TelegramChatType
  ) {}

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

  public toApi(): TelegramBot.Message {
    return {
      text: this.text,
      message_id: this.messageId,
      date: new Date().getDate(),
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
}

export enum TelegramChatType {
  Private = "private",
  Group = "group",
  Channel = "channel",
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

  public getDto() {
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
