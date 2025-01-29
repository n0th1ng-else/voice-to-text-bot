import { Logger } from "../../logger/index.ts";
import { getTranslator } from "../../text/index.ts";
import { splitTextIntoParts } from "../../common/helpers.ts";
import {
  TELEGRAM_API_MAX_MESSAGE_SIZE,
  type TelegramApi,
} from "../api/tgapi.ts";
import type { TgMessage, TgMessageOptions } from "../api/types.ts";
import type {
  BotMessageModel,
  MessageOptions,
  TelegramMessagePrefix,
} from "../types.ts";
import type { getDb } from "../../db/index.ts";
import type { LanguageCode } from "../../recognition/types.ts";
import type { TranslationKey } from "../../text/types.ts";

const logger = new Logger("telegram-bot");

export abstract class GenericAction {
  protected readonly text = getTranslator();

  protected readonly stat: ReturnType<typeof getDb>;
  protected readonly bot: TelegramApi;

  constructor(stat: ReturnType<typeof getDb>, bot: TelegramApi) {
    this.stat = stat;
    this.bot = bot;
  }

  public abstract runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void>;

  public abstract runCondition(
    msg: TgMessage,
    mdl: BotMessageModel,
  ): Promise<boolean>;

  public async getChatLanguage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang?: LanguageCode,
  ): Promise<LanguageCode> {
    if (lang) {
      return Promise.resolve(lang);
    }

    logger.info(`${prefix.getPrefix()} Fetching language`);
    return this.stat
      .getLanguage(model.chatId, model.name, model.userLanguage)
      .catch((err) => {
        const errorMessage = "Unable to get the lang";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
        return this.text.getFallbackLanguage();
      });
  }

  public async sendMessage(
    chatId: number,
    messageId: number,
    ids: TranslationKey | TranslationKey[],
    meta: MessageOptions,
    prefix: TelegramMessagePrefix,
    forumThreadId?: number,
  ): Promise<void> {
    const msgs = Array.isArray(ids) ? ids : [ids];
    if (!msgs.length) {
      return Promise.resolve();
    }

    const part = msgs.shift();
    if (!part) {
      return Promise.resolve();
    }

    logger.info(`${prefix.getPrefix()} Sending the message`);
    return this.sendRawMessage(
      chatId,
      this.text.t(part, meta.lang),
      meta.lang,
      meta.options,
      forumThreadId,
    )
      .then(() =>
        this.sendMessage(chatId, messageId, msgs, meta, prefix, forumThreadId),
      )
      .catch((err) => {
        logger.error(`${prefix.getPrefix()} Unable to send the message`, err);
        throw err;
      });
  }

  public async editMessage(
    chatId: number,
    messageId: number,
    meta: MessageOptions,
    id: TranslationKey,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    return this.bot
      .editMessageText(
        chatId,
        messageId,
        this.text.t(id, meta.lang),
        meta.options,
      )
      .then(() => logger.info(`${prefix.getPrefix()} Updated message`));
  }

  protected async sendRawMessage(
    chatId: number,
    message: string,
    lang: LanguageCode,
    options: TgMessageOptions = {},
    forumThreadId?: number,
  ): Promise<void> {
    const messageParts = splitTextIntoParts(
      message,
      lang,
      TELEGRAM_API_MAX_MESSAGE_SIZE,
    );
    return this.sendRawMessageParts(
      chatId,
      messageParts,
      options,
      forumThreadId,
    );
  }

  private async sendRawMessageParts(
    chatId: number,
    messageParts: string[],
    options: TgMessageOptions = {},
    forumThreadId?: number,
  ): Promise<void> {
    const message = messageParts.shift();
    if (!message) {
      return Promise.resolve();
    }

    return this.bot
      .sendMessage(chatId, message, options, forumThreadId)
      .then(() =>
        this.sendRawMessageParts(chatId, messageParts, options, forumThreadId),
      );
  }
}

export class CoreAction extends GenericAction {
  public runAction(): Promise<void> {
    return Promise.resolve();
  }

  public async runCondition(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
