import { z } from "zod";
import { Logger } from "../../logger/index.js";
import { GenericAction } from "./common.js";
import {
  BotCommand,
  BotMessageModel,
  TelegramButtonModel,
  type TelegramMessagePrefix,
} from "../types.js";
import type { TgInlineKeyboardButton, TgMessage } from "../api/types.js";
import { isCommandMessage } from "../helpers.js";
import {
  type ActiveSubscriptionItem,
  getSubscriptionFromCache,
} from "../../subscription/subscriptions.js";
import { collectAnalytics } from "../../analytics/index.js";
import { type LanguageCode } from "../../recognition/types.js";
import { TranslationKeys } from "../../text/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";

const SubscriptionBtnActionSchema = z
  .union([
    z.literal("+").describe("subscribe"),
    z.literal("-").describe("unsubscribe"),
  ])
  .describe("Subscription action");

type SubscriptionBtnAction = z.infer<typeof SubscriptionBtnActionSchema>;

const logger = new Logger("telegram-bot");

export class SubscriptionAction extends GenericAction {
  runCondition(msg: TgMessage, mdl: BotMessageModel): Promise<boolean> {
    return Promise.resolve(isCommandMessage(mdl, msg, BotCommand.Subscription));
  }

  runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    return this.sendSubscriptionMessage(mdl, prefix);
  }

  private async sendSubscriptionMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending subscription message`);

    try {
      const subscription = getSubscriptionFromCache(model.chatId);
      const lang = await this.getChatLanguage(model, prefix);
      if (!subscription) {
        await this.sendNotSubscribedMessage(prefix, model, lang);
      } else {
        await this.sendSubscribedMessage(subscription, prefix, model, lang);
      }

      logger.info(`${prefix.getPrefix()} Subscription message sent`);
    } catch (err) {
      const errorMessage = "Unable to send subscription message";
      logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
      model.analytics.addError(errorMessage);
    }

    await collectAnalytics(
      model.analytics.setCommand(
        BotCommand.Subscription,
        "Subscription message",
        "Init",
      ),
    );
  }

  public async runCallback(
    msg: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData,
  ): Promise<void> {
    analytics.addPageVisit();
    const model = new BotMessageModel(msg, analytics);

    const action = await this.getButtonTypeClicked(button);

    switch (action) {
      case "+":
        return await this.showSubscriptionForm(model);
      case "-":
        return await this.showCancelSubscription(model);
      default:
    }
  }

  private async showSubscriptionForm(mdl: BotMessageModel): Promise<void> {
    logger.warn("TODO implement", mdl);
    return Promise.resolve();
  }

  private async showCancelSubscription(mdl: BotMessageModel): Promise<void> {
    logger.warn("TODO implement", mdl);
    return Promise.resolve();
  }

  private async getButtonTypeClicked(
    button: TelegramButtonModel,
  ): Promise<SubscriptionBtnAction> {
    if (!button.value) {
      return Promise.reject(
        new Error(
          "No subscription action provided. Unable to handle subscription.",
        ),
      );
    }

    const action = SubscriptionBtnActionSchema.parse(button.value);
    return action;
  }

  private async sendNotSubscribedMessage(
    prefix: TelegramMessagePrefix,
    model: BotMessageModel,
    lang: LanguageCode,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending ask to subscribe`);

    const button = new TelegramButtonModel<SubscriptionBtnAction>(
      "s",
      "+",
      prefix.id,
    );

    const btn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnSubscribe, lang),
      callback_data: button.getDtoString(),
    };

    await this.sendMessage(
      model.chatId,
      model.id,
      [TranslationKeys.NoActiveSubscription],
      {
        lang,
        options: {
          buttons: [[btn]],
        },
      },
      prefix,
      model.forumThreadId,
    );
  }

  private async sendSubscribedMessage(
    subscription: ActiveSubscriptionItem,
    prefix: TelegramMessagePrefix,
    model: BotMessageModel,
    lang: LanguageCode,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending subscription info`);

    const button = new TelegramButtonModel<SubscriptionBtnAction>(
      "s",
      "-",
      prefix.id,
    );

    const btn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnUnsubscribe, lang),
      callback_data: button.getDtoString(),
    };

    await this.sendMessage(
      model.chatId,
      model.id,
      [TranslationKeys.HasActiveSubscription],
      {
        lang,
        options: {
          buttons: [[btn]],
        },
      },
      prefix,
      model.forumThreadId,
    );
  }
}
