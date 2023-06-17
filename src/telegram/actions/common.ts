import { TgInlineKeyboardButton, TgMessage } from "../api/types.js";
import {
  BotMessageModel,
  MessageOptions,
  TelegramMessagePrefix,
} from "../types.js";
import { LanguageCode } from "../../recognition/types.js";
import { Logger } from "../../logger/index.js";
import { TextModel } from "../../text/index.js";
import { LabelId } from "../../text/labels.js";
import { TELEGRAM_API_MAX_MESSAGE_SIZE, TelegramApi } from "../api/tgapi.js";
import { DbClient } from "../../db/index.js";
import { splitTextIntoParts } from "../../common/helpers.js";

const logger = new Logger("telegram-bot");

export abstract class GenericAction {
  protected readonly text = new TextModel();

  constructor(
    protected readonly stat: DbClient,
    protected readonly bot: TelegramApi
  ) {}

  public abstract runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void>;

  public abstract runCondition(msg: TgMessage, mdl: BotMessageModel): boolean;

  public getChatLanguage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang?: LanguageCode
  ): Promise<LanguageCode> {
    if (lang) {
      return Promise.resolve(lang);
    }

    logger.info(`${prefix.getPrefix()} Fetching language`);
    return this.stat.usages
      .getLangId(model.chatId, model.name, model.userLanguage)
      .catch((err) => {
        const errorMessage = "Unable to get the lang";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
        return this.text.fallbackLanguage;
      });
  }

  public sendMessage(
    messageId: number,
    chatId: number,
    ids: LabelId | LabelId[],
    meta: MessageOptions,
    prefix: TelegramMessagePrefix,
    forumThreadId?: number
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
      {
        buttons: meta.options,
      },
      forumThreadId
    )
      .then(() =>
        this.sendMessage(messageId, chatId, msgs, meta, prefix, forumThreadId)
      )
      .catch((err) => {
        logger.error(`${prefix.getPrefix()} Unable to send the message`, err);
        throw err;
      });
  }

  public editMessage(
    chatId: number,
    messageId: number,
    meta: MessageOptions,
    id: LabelId,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    return this.bot
      .editMessageText(chatId, messageId, this.text.t(id, meta.lang), {
        buttons: meta.options,
      })
      .then(() => logger.info(`${prefix.getPrefix()} Updated message`));
  }

  protected sendRawMessage(
    chatId: number,
    message: string,
    lang: LanguageCode,
    options: {
      buttons?: TgInlineKeyboardButton[][];
      disableMarkup?: boolean;
    } = {},
    forumThreadId?: number
  ): Promise<void> {
    const messageParts = splitTextIntoParts(
      message,
      lang,
      TELEGRAM_API_MAX_MESSAGE_SIZE
    );
    return this.sendRawMessageParts(
      chatId,
      messageParts,
      options,
      forumThreadId
    );
  }

  private sendRawMessageParts(
    chatId: number,
    messageParts: string[],
    options: {
      buttons?: TgInlineKeyboardButton[][];
      disableMarkup?: boolean;
    } = {},
    forumThreadId?: number
  ): Promise<void> {
    const message = messageParts.shift();
    if (!message) {
      return Promise.resolve();
    }

    return this.bot
      .sendMessage(chatId, message, options, forumThreadId)
      .then(() =>
        this.sendRawMessageParts(chatId, messageParts, options, forumThreadId)
      );
  }
}

export class CoreAction extends GenericAction {
  public runAction(): Promise<void> {
    return Promise.resolve();
  }

  public runCondition(): boolean {
    return false;
  }
}
