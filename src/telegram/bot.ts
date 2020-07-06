import TelegramBot from "node-telegram-bot-api";
import { Logger } from "../logger";
import { VoiceConverter } from "../recognition/types";
import { StatisticApi } from "../statistic";
import { LabelId } from "../text/labels";
import { BotMessageModel, TelegramMessagePrefix } from "./types";
import { isMessageSupported } from "./helpers";
import { runPromiseWithRetry } from "../common/helpers";
import { getMd5Hash } from "../common/hash";
import { BotActions } from "./actions";
import { botCommands } from "./data";

const logger = new Logger("telegram-bot");

export class TelegramBotModel {
  private readonly bot: TelegramBot;
  private readonly actions: BotActions;
  private id = "";
  private host = "";
  private path = "";

  constructor(
    private readonly token: string,
    converter: VoiceConverter,
    stat: StatisticApi
  ) {
    this.bot = new TelegramBot(this.token);
    this.actions = new BotActions(stat, this.bot);
    this.actions.voice.setConverter(converter);
    this.bot.on("message", (msg) => this.handleMessage(msg));
    this.bot.on("callback_query", (msg) => this.handleCallbackQuery(msg));
  }

  public setHostLocation(host: string, path = "/bot/message"): this {
    this.host = host;
    this.path = path;
    this.id = getMd5Hash(`${this.host}${this.path}:${this.token}`);
    return this;
  }

  public setAuthor(url: string): this {
    this.actions.support.setAuthorUrl(url);
    return this;
  }

  public applyHostLocation(): Promise<boolean> {
    const hookUrl = `${this.host}${this.getPath()}`;
    logger.warn(`WebHook url is ${hookUrl}`);
    return runPromiseWithRetry("bot.applyHostLocation", () =>
      this.bot.setWebHook(hookUrl)
    ).then(() =>
      runPromiseWithRetry("bot.setMyCommands", () =>
        this.bot.setMyCommands(botCommands)
      )
    );
  }

  public getHostLocation(): Promise<string> {
    return this.bot.getWebHookInfo().then((info) => info.url);
  }

  public getPath(): string {
    return `${this.path}/${this.id}`;
  }

  public handleApiMessage(message: TelegramBot.Update): void {
    try {
      this.bot.processUpdate(message);
    } catch (e) {
      logger.error("Failed to handle api request", e);
    }
  }

  private handleMessage(msg: TelegramBot.Message): Promise<void> {
    const model = new BotMessageModel(msg);
    const prefix = new TelegramMessagePrefix(model.chatId);

    logger.info(`${prefix.getPrefix()} Incoming message`);

    if (!isMessageSupported(msg)) {
      return TelegramBotModel.logNotSupportedMessage(prefix);
    }

    if (this.actions.start.runCondition(msg, model)) {
      return this.actions.start.runAction(msg, model, prefix);
    }

    if (this.actions.lang.runCondition(msg, model)) {
      return this.actions.lang.runAction(msg, model, prefix);
    }

    if (this.actions.support.runCondition(msg, model)) {
      return this.actions.support.runAction(msg, model, prefix);
    }

    if (this.actions.voice.runCondition(msg, model)) {
      return this.actions.voice.runAction(msg, model, prefix);
    }

    return this.sendNoVoiceMessage(model, prefix);
  }

  private static logNotSupportedMessage(
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    logger.warn(`${prefix.getPrefix()} Message is not supported`);
    return Promise.resolve();
  }

  private sendNoVoiceMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    if (model.isGroup) {
      logger.info(`${prefix.getPrefix()} No content`);
      return Promise.resolve();
    }

    logger.info(`${prefix.getPrefix()} Sending no content`);
    return this.actions.core
      .getChatLanguage(model, prefix)
      .then((lang) =>
        this.actions.core.sendMessage(
          model.id,
          model.chatId,
          LabelId.NoContent,
          { lang },
          prefix
        )
      )
      .catch((err) =>
        logger.error(`${prefix.getPrefix()} Unable to send no content`, err)
      );
  }

  private handleCallbackQuery(msg: TelegramBot.CallbackQuery): void {
    this.actions.lang.handleLanguageChange(msg);
  }
}
