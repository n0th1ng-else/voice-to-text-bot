import { z } from "zod";
import { nanoid } from "nanoid";
import { Logger } from "../logger/index.js";
import { getTranslator } from "../text/index.js";
import type { LanguageCode } from "../recognition/types.js";
import type { ValueOf } from "../common/types.js";
import { type ChatId, TgChatId } from "./api/core.js";
import type { TgMessageOptions } from "./api/groups/chats/chats-types.js";
import type { BotCommandType } from "./commands.js";

export const VoiceContentReason = {
  Ok: "Ok",
  NoContent: "NoContent",
  NoDuration: "NoDuration",
  WrongMimeType: "WrongMimeType",
} as const;

export type VoiceContentReasonType = ValueOf<typeof VoiceContentReason>;

export class VoiceContentReasonModel {
  public readonly type: VoiceContentReasonType;
  public readonly info?: string | number;

  constructor(type: VoiceContentReasonType, info?: string | number) {
    this.type = type;
    this.info = info;
  }
}

export type MessageOptions = {
  lang: LanguageCode;
  options?: TgMessageOptions;
};

export class TelegramMessagePrefix {
  public readonly chatId: ChatId;
  public readonly id: string;

  constructor(chatId: ChatId, id = nanoid(10)) {
    this.chatId = chatId;
    this.id = id;
  }

  public getPrefix(): string {
    return `[Id=${Logger.y(this.id)}] [ChatId=${Logger.y(this.chatId)}]`;
  }
}

export class BotLangData {
  public readonly langId: LanguageCode;
  public readonly prefix: TelegramMessagePrefix;

  constructor(langId: LanguageCode, prefix: TelegramMessagePrefix) {
    this.langId = langId;
    this.prefix = prefix;
  }
}

export class BotCommandOption {
  public readonly description: string;
  public readonly command: BotCommandType;

  constructor(command: BotCommandType) {
    this.command = command;
    const translator = getTranslator();
    this.description = translator.menu(command);
  }
}

const TelegramButtonTypeSchema = z
  .union([
    z.literal("d").describe("Donation"),
    z.literal("l").describe("Language"),
    z.literal("u").describe("Unknown"),
    z.literal("s").describe("Subscription"),
  ])
  .describe("Supported Button type schemas (in messages)");

export type TelegramButtonType = z.infer<typeof TelegramButtonTypeSchema>;

const ButtonSchema = z
  .object({
    i: TelegramButtonTypeSchema,
    l: z.string(),
    v: z.string(),
  })
  .describe(
    "Button schema used in Telegram callback. i is Button Type, l is Log prefix, v is Value",
  );

export type BotButtonDto = z.infer<typeof ButtonSchema>;

export class TelegramButtonModel<V extends string = string> {
  public static fromDto(dtoString: string): TelegramButtonModel {
    try {
      const obj = ButtonSchema.parse(JSON.parse(dtoString));
      return new TelegramButtonModel(obj.i, obj.v, obj.l);
    } catch {
      return new TelegramButtonModel("u", "", "");
    }
  }

  public readonly id: TelegramButtonType;
  public readonly value: V;
  public readonly logPrefix: string;

  constructor(id: TelegramButtonType, value: V, logPrefix: string) {
    this.id = id;
    this.value = value;
    this.logPrefix = logPrefix;
  }

  public getDtoString(): string {
    const dto: BotButtonDto = {
      i: this.id,
      l: this.logPrefix,
      v: this.value,
    };

    return JSON.stringify(dto);
  }
}

export type PaymentPayload = {
  paymentInternalId: string;
  chatId: ChatId;
  prefix: string;
};

export const PaymentInvoiceSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe(
        "Payment id, can be DonationId, SubscriptionId etc.. Optional for backward compatibility!",
      ),
    d: z
      .number()
      .optional()
      .describe(
        "Donation id [DEPRECATED Backward compatible with old implementation]",
      ),
    c: TgChatId,
    l: z.string().describe("Log prefix"),
  })
  .describe("Payment invoice schema used in Telegram callback");

export type PaymentInvoiceDto = z.infer<typeof PaymentInvoiceSchema>;

export type ChatType = "private" | "group" | "supergroup" | "channel" | "forum";

export type VoiceType = "audio" | "video_note" | "voice_note" | "unknown";
