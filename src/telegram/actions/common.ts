import { Logger } from "../../logger/index.js";
import { getTranslator } from "../../text/index.js";
import { splitTextIntoParts } from "../../common/helpers.js";
import {
  TELEGRAM_API_MAX_MESSAGE_SIZE,
  type TelegramApi,
} from "../api/tgapi.js";
import type { TgMessage, TgMessageOptions } from "../api/types.js";
import type {
  BotMessageModel,
  MessageOptions,
  TelegramMessagePrefix,
} from "../types.js";
import type { getDb } from "../../db/index.js";
import type { LanguageCode } from "../../recognition/types.js";
import {
  type TranslationKey,
  type TranslationKeyFull,
} from "../../text/types.js";
import type { ChatId, MessageId, MessageThreadId } from "../api/core.js";

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
    chatId: ChatId,
    ids: TranslationKeyFull[],
    meta: MessageOptions,
    prefix: TelegramMessagePrefix,
    forumThreadId?: MessageThreadId,
  ): Promise<void> {
    if (!ids.length) {
      return Promise.resolve();
    }

    const part = ids.shift();
    if (!part) {
      return Promise.resolve();
    }

    const [partKey, partParams] = Array.isArray(part) ? part : [part];
    logger.info(`${prefix.getPrefix()} Sending the message`);
    return this.sendRawMessage(
      chatId,
      this.text.t(partKey, meta.lang, partParams),
      meta.lang,
      meta.options,
      forumThreadId,
    )
      .then(() => this.sendMessage(chatId, ids, meta, prefix, forumThreadId))
      .catch((err) => {
        logger.error(`${prefix.getPrefix()} Unable to send the message`, err);
        throw err;
      });
  }

  public async editMessage(
    chatId: ChatId,
    messageId: MessageId,
    meta: MessageOptions,
    id: TranslationKey,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    return this.bot.chats
      .editMessageText(
        chatId,
        messageId,
        this.text.t(id, meta.lang),
        meta.options,
      )
      .then(() => logger.info(`${prefix.getPrefix()} Updated message`));
  }

  protected async sendRawMessage(
    chatId: ChatId,
    message: string,
    lang: LanguageCode,
    options: TgMessageOptions = {},
    forumThreadId?: MessageThreadId,
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
    chatId: ChatId,
    messageParts: string[],
    options: TgMessageOptions = {},
    forumThreadId?: MessageThreadId,
  ): Promise<void> {
    const message = messageParts.shift();
    if (!message) {
      return Promise.resolve();
    }

    return this.bot.chats
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
