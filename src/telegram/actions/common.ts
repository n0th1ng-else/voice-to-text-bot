import { TgInlineKeyboardButton, TgMessage } from "../api/types";
import {
  BotMessageModel,
  MessageOptions,
  TelegramMessagePrefix,
} from "../types";
import { LanguageCode } from "../../recognition/types";
import { Logger } from "../../logger";
import { StatisticApi } from "../../statistic";
import { TextModel } from "../../text";
import { LabelId } from "../../text/labels";
import { TelegramApi } from "../api";

const logger = new Logger("telegram-bot");

export abstract class GenericAction {
  protected readonly text = new TextModel();

  constructor(
    protected readonly stat: StatisticApi,
    protected readonly bot: TelegramApi
  ) {}

  public abstract runAction(
    msg: TgMessage,
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
    return this.stat.usage
      .getLanguage(model.chatId, model.name)
      .catch((err) => {
        logger.error(`${prefix.getPrefix()} Unable to get the lang`, err);
        return this.text.fallbackLanguage;
      });
  }

  public sendMessage(
    messageId: number,
    chatId: number,
    ids: LabelId | LabelId[],
    meta: MessageOptions,
    prefix: TelegramMessagePrefix
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
      meta.options
    )
      .then(() => this.sendMessage(messageId, chatId, msgs, meta, prefix))
      .catch((err) =>
        logger.error(`${prefix.getPrefix()} Unable to send the message`, err)
      );
  }

  public editMessage(
    chatId: number,
    lang: LanguageCode,
    messageId: number,
    id: LabelId,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    return this.bot
      .editMessageText(chatId, messageId, this.text.t(id, lang))
      .then(() => logger.info(`${prefix.getPrefix()} Updated message`))
      .catch((err) =>
        logger.error(`${prefix.getPrefix()} Unable to edit the message`, err)
      );
  }

  protected sendRawMessage(
    chatId: number,
    message: string,
    options?: TgInlineKeyboardButton[][]
  ): Promise<void> {
    return this.bot.sendMessage(chatId, message, options).then(() => {
      // Empty promise result
    });
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
