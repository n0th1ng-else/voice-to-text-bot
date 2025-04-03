import {
  type TgCallbackQuery,
  type TgCheckoutQuery,
  type TgMessage,
  type TgUpdate,
} from "./api/types.js";
import { Logger } from "../logger/index.js";
import { type VoiceConverters } from "../recognition/types.js";
import { TranslationKeys } from "../text/types.js";
import { BotMessageModel, TelegramMessagePrefix } from "./types.js";
import { isMessageSupported } from "./helpers.js";
import { runPromiseWithRetry } from "../common/helpers.js";
import { getMd5Hash } from "../common/hash.js";
import { BotActions } from "./actions/index.js";
import { getBotMenuCommands } from "./data.js";
import { TelegramApi } from "./api/tgapi.js";
import { collectAnalytics } from "../analytics/index.js";
import { type AnalyticsData } from "../analytics/ga/types.js";
import { type PaymentService } from "../donate/types.js";
import { initTgReflector } from "./reflector.js";
import type { getDb } from "../db/index.js";

const logger = new Logger("telegram-bot");

export class TelegramBotModel {
  private readonly bot: TelegramApi;
  private readonly actions: BotActions;
  private readonly token: string;
  private id = "";
  private host = "";
  private path = "";

  public static async factory(
    apiToken: string,
    appId: number,
    appHash: string,
    converters: VoiceConverters,
    stat: ReturnType<typeof getDb>,
  ): Promise<TelegramBotModel> {
    const api = new TelegramBotModel(
      apiToken,
      appId,
      appHash,
      converters,
      stat,
    );

    // TODO consumes too much memory?
    await Promise.resolve();
    // await api.init();

    return api;
  }

  private constructor(
    apiToken: string,
    appId: number,
    appHash: string,
    converters: VoiceConverters,
    stat: ReturnType<typeof getDb>,
  ) {
    this.token = apiToken;

    this.bot = new TelegramApi(this.token, appId, appHash);
    const reflector = initTgReflector({
      leaveChat: (chatId) => this.bot.chats.leaveChat(chatId),
    });
    this.bot.setErrorReflector(reflector);
    this.actions = new BotActions(stat, this.bot);
    this.actions.voice.setConverters(converters);
  }

  public async init(): Promise<void> {
    await this.bot.init();
  }

  public async stop(): Promise<void> {
    await this.bot.stop();
  }

  public getId(): string {
    return this.id;
  }

  public setHostLocation(
    host: string,
    launchTime = new Date().getTime(),
    path = "/bot/message",
  ): this {
    this.host = host;
    this.path = path;
    this.id = getMd5Hash(this.host, this.path, this.token, launchTime);
    return this;
  }

  public setAuthor(url: string): this {
    this.actions.support.setAuthorUrl(url);
    return this;
  }

  public applyHostLocationIfNeeded(timeoutMs: number): Promise<boolean> {
    const hookUrl = `${this.host}${this.getPath()}`;
    logger.info(`WebHook url is ${Logger.y(hookUrl)}`);

    return runPromiseWithRetry("bot.getWebHookInfo", () =>
      this.bot.updates.getWebHookInfo(),
    ).then((info) => {
      if (info.url === hookUrl) {
        return true;
      }

      return this.applyHostLocation(timeoutMs);
    });
  }

  private applyHostLocation(timeoutMs: number): Promise<boolean> {
    const hookUrl = `${this.host}${this.getPath()}`;
    logger.info(`Applying WebHook url is ${Logger.y(hookUrl)}`);
    return runPromiseWithRetry(
      "bot.applyHostLocation",
      () => this.bot.updates.setWebHook(hookUrl),
      timeoutMs,
    ).then(() =>
      runPromiseWithRetry("bot.setMyCommands", () =>
        this.bot.updates.setMyCommands(getBotMenuCommands()),
      ),
    );
  }

  public getHostLocation(): Promise<string> {
    return this.bot.updates.getWebHookInfo().then((info) => info.url);
  }

  public setPayment(payment: PaymentService): this {
    this.actions.setPayment(payment);
    return this;
  }

  public getPath(id = this.id): string {
    return `${this.path}/${id}`;
  }

  public async handleApiMessage(
    message: TgUpdate,
    analytics: AnalyticsData,
  ): Promise<void> {
    return Promise.resolve()
      .then(() => {
        if (message.message) {
          return this.handleMessage(message.message, analytics);
        }
        if (message.callback_query) {
          return this.handleCallbackQuery(message.callback_query, analytics);
        }
        if (message.pre_checkout_query) {
          return this.handleCheckout(message.pre_checkout_query, analytics);
        }

        logger.warn("Message is not recognized", {
          messageKeys: Object.keys(message),
        });
      })
      .catch((err) => {
        logger.error("Failed to handle api request", err);
      });
  }

  private async handleMessage(
    msg: TgMessage,
    analytics: AnalyticsData,
  ): Promise<void> {
    const model = new BotMessageModel(msg, analytics);
    const prefix = new TelegramMessagePrefix(model.chatId);

    logger.debug(`${prefix.getPrefix()} Incoming message`);

    // TODO enable with caching
    // if (await this.actions.ignore.runCondition(msg, model)) {
    //   return this.actions.ignore.runAction(model, prefix);
    // }

    if (!isMessageSupported(msg)) {
      return TelegramBotModel.logNotSupportedMessage(model, prefix);
    }

    if (await this.actions.start.runCondition(msg, model)) {
      return this.actions.start.runAction(model, prefix);
    }

    if (await this.actions.lang.runCondition(msg, model)) {
      return this.actions.lang.runAction(model, prefix);
    }

    if (await this.actions.support.runCondition(msg, model)) {
      return this.actions.support.runAction(model, prefix);
    }

    if (await this.actions.donate.runCondition(msg, model)) {
      return this.actions.donate.runAction(model, prefix);
    }

    if (await this.actions.voiceFormat.runCondition(msg, model, prefix)) {
      return this.actions.voiceFormat.runAction(model, prefix);
    }

    if (await this.actions.voiceLength.runCondition(msg, model)) {
      return this.actions.voiceLength.runAction(model, prefix);
    }

    if (await this.actions.voice.runCondition(msg, model, prefix)) {
      return this.actions.voice.runAction(model, prefix);
    }

    if (await this.actions.checkout.runCondition(msg)) {
      return this.actions.checkout.runAction(model, prefix);
    }

    return this.sendNoVoiceMessage(model, prefix);
  }

  private static logNotSupportedMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.warn("Message is not supported", { ...prefix });
    return collectAnalytics(
      model.analytics.setCommand("/app", "Message is not supported"),
    );
  }

  private async sendNoVoiceMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    if (model.isGroup) {
      logger.info(`${prefix.getPrefix()} No content`);
      return collectAnalytics(
        model.analytics.setCommand("/voice", "No voice content", "Group"),
      );
    }

    logger.info(`${prefix.getPrefix()} Sending no content`);
    return this.actions.core
      .getChatLanguage(model, prefix)
      .then((lang) =>
        this.actions.core.sendMessage(
          model.chatId,
          [TranslationKeys.NoContent],
          { lang },
          prefix,
          model.forumThreadId,
        ),
      )
      .catch((err) => {
        const errorMessage = "Unable to send no content";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand("/voice", "No voice content", "Private"),
        ),
      );
  }

  private handleCallbackQuery(
    msg: TgCallbackQuery,
    analytics: AnalyticsData,
  ): Promise<void> {
    return this.actions.handleCallback(msg, analytics);
  }

  private handleCheckout(
    msg: TgCheckoutQuery,
    analytics: AnalyticsData,
  ): Promise<void> {
    return this.actions.handleCheckout(msg, analytics);
  }
}
