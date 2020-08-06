import { TgCallbackQuery, TgMessage, TgUpdate } from "./api/types";
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
import { TelegramApi } from "./api";

const logger = new Logger("telegram-bot");

export class TelegramBotModel {
  private readonly bot: TelegramApi;
  private readonly actions: BotActions;
  private id = "";
  private host = "";
  private path = "";

  constructor(
    private readonly token: string,
    converter: VoiceConverter,
    stat: StatisticApi
  ) {
    this.bot = new TelegramApi(this.token);
    this.actions = new BotActions(stat, this.bot);
    this.actions.voice.setConverter(converter);
  }

  public setHostLocation(
    host: string,
    launchTime: number,
    path = "/bot/message"
  ): this {
    this.host = host;
    this.path = path;
    this.id = getMd5Hash(`${this.host}${this.path}:${this.token}`, launchTime);
    return this;
  }

  public setAuthor(url: string): this {
    this.actions.support.setAuthorUrl(url);
    return this;
  }

  public applyHostLocationIfNeeded(timeoutMs: number): Promise<boolean> {
    const hookUrl = `${this.host}${this.getPath()}`;
    logger.warn(`WebHook url is ${Logger.y(hookUrl)}`);

    return runPromiseWithRetry("bot.getWebHookInfo", () =>
      this.bot.getWebHookInfo()
    ).then((info) => {
      if (info.url === hookUrl) {
        return true;
      }

      return this.applyHostLocation(timeoutMs);
    });
  }

  private applyHostLocation(timeoutMs: number): Promise<boolean> {
    const hookUrl = `${this.host}${this.getPath()}`;
    logger.warn(`Applying WebHook url is ${Logger.y(hookUrl)}`);
    return runPromiseWithRetry(
      "bot.applyHostLocation",
      () => this.bot.setWebHook(hookUrl),
      timeoutMs
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

  public handleApiMessage(message: TgUpdate): void {
    try {
      if (message.message) {
        this.handleMessage(message.message);
      }
      if (message.callback_query) {
        this.handleCallbackQuery(message.callback_query);
      }
    } catch (e) {
      logger.error("Failed to handle api request", e);
    }
  }

  private handleMessage(msg: TgMessage): Promise<void> {
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

    if (this.actions.fund.runCondition(msg, model)) {
      return this.actions.fund.runAction(msg, model, prefix);
    }

    if (this.actions.voiceFormat.runCondition(msg)) {
      return this.actions.voiceFormat.runAction(msg, model, prefix);
    }

    if (this.actions.voice.runCondition(msg)) {
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

  private handleCallbackQuery(msg: TgCallbackQuery): void {
    this.actions.lang.handleLanguageChange(msg);
  }
}
