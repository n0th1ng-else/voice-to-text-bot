import { z } from "zod";
import { Logger } from "../../logger/index.js";
import { GenericAction } from "./common.js";
import {
  BotCommand,
  BotMessageModel,
  TelegramButtonModel,
  TelegramMessagePrefix,
} from "../types.js";
import { getBotLogo, isCommandMessage } from "../helpers.js";
import {
  type ActiveSubscriptionItem,
  addSubscriptionCacheItem,
  getSubscriptionFromCache,
} from "../../subscription/subscriptions.js";
import { collectAnalytics } from "../../analytics/index.js";
import { type TranslationKeyFull, TranslationKeys } from "../../text/types.js";
import { subscriptionDurationDays, subscriptionPrice } from "../../const.js";
import type { TgMessage } from "../api/types.js";
import type { LanguageCode } from "../../recognition/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";
import type { ChatId, MessageId } from "../api/core.js";
import type { TgInlineKeyboardButton } from "../api/groups/chats/chats-types.js";
import { isPremiumLanguage } from "../../subscription/utils.js";

const logger = new Logger("telegram-bot");

const SubscriptionBtnActionSchema = z
  .union([
    z.literal("u").describe("unsubscribe button clicked"),
    z.literal("-").describe("unsubscribe confirmed"),
    z.literal("+").describe("get back to subscription overview"),
    z.literal("c").describe("subscription cancelled"),
    z.literal("a").describe("prompt to auto-subscribe"),
  ])
  .describe("Subscription action");

// TODO remove
const isOwner = (chatId: ChatId): boolean => chatId === 744639;

type SubscriptionBtnAction = z.infer<typeof SubscriptionBtnActionSchema>;

const getSubscriptionButton = (
  action: SubscriptionBtnAction,
  logPrefix: string,
): TelegramButtonModel => {
  return new TelegramButtonModel<SubscriptionBtnAction>("s", action, logPrefix);
};

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
      const lang = await this.getChatLanguage(model, prefix);
      await this.showSubscriptionOverview(model, prefix, lang);
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
    const prefix = new TelegramMessagePrefix(model.chatId, button.logPrefix);
    const lang = await this.getChatLanguage(model, prefix);

    switch (action) {
      case "u":
        return await this.showConfirmUnsubscribe(model, prefix, lang);
      case "+":
        return await this.showSubscriptionOverview(
          model,
          prefix,
          lang,
          model.id,
        );
      case "-":
        return await this.cancelSubscription(model, prefix, lang);
      case "c":
        return await this.cancelledConfirmed(model, prefix, lang);
      case "a":
        return await this.autoSubscribe(model, prefix, lang);
      default:
        throw new Error("Unknown button value");
    }
  }

  private async showConfirmUnsubscribe(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
  ): Promise<void> {
    const subscription = getSubscriptionFromCache(mdl.chatId);

    if (!subscription) {
      throw new Error("No subscription found", {
        cause: { chatId: mdl.chatId },
      });
    }

    const backButton = getSubscriptionButton("+", prefix.id);
    const backBtn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnBack, lang),
      callback_data: backButton.getDtoString(),
    };

    const isPremiumLang = isPremiumLanguage(lang);
    const translationId: TranslationKeyFull = isPremiumLang
      ? [
          TranslationKeys.ConfirmUnsubscribeLang,
          {
            date: this.text.date(subscription.endDate, lang),
          },
        ]
      : [
          TranslationKeys.ConfirmUnsubscribe,
          {
            date: this.text.date(subscription.endDate, lang),
          },
        ];

    const unsubscribeButton = getSubscriptionButton("-", prefix.id);
    const unsubscribeBtn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnConfirmUnsubscribe, lang),
      callback_data: unsubscribeButton.getDtoString(),
    };

    return await this.editMessage(
      mdl.chatId,
      mdl.id,
      {
        lang,
        options: {
          buttons: [[backBtn, unsubscribeBtn]],
        },
      },
      translationId,
      prefix,
    );
  }

  private async showSubscriptionOverview(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
    messageId?: MessageId,
  ): Promise<void> {
    const subscription = getSubscriptionFromCache(model.chatId);
    if (!subscription) {
      await this.sendNotSubscribedMessage(prefix, model, lang, messageId);
    } else {
      await this.sendSubscribedMessage(
        subscription,
        prefix,
        model,
        lang,
        messageId,
      );
    }
  }

  private async cancelSubscription(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
  ): Promise<void> {
    logger.warn("TODO implement cancelSubscription", { mdl, prefix, lang });
    return Promise.resolve();
  }

  private async cancelledConfirmed(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
  ): Promise<void> {
    logger.warn("TODO implement cancelledConfirmed", { mdl, prefix, lang });
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
    messageId?: MessageId,
  ): Promise<void> {
    logger.info(
      `${prefix.getPrefix()} Sending ask to subscribe ${model.id} ${model.chatId}`,
    );

    const owner = isOwner(model.chatId);
    const button = getSubscriptionButton("a", prefix.id);

    // TODO fill in
    const url = await this.bot.payments.createInvoiceLink(model.chatId, {
      amount: subscriptionPrice,
      description: "description",
      label: "label",
      meta: "meta",
      payload: "payload",
      photo: getBotLogo(),
      subscriptionPeriod: subscriptionDurationDays,
      title: "unlock more languages",
    });

    const btnData = owner ? { callback_data: button.getDtoString() } : { url };
    const btn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnSubscribe, lang),
      ...btnData,
    };

    if (messageId) {
      await this.editMessage(
        model.chatId,
        messageId,
        {
          lang,
          options: {
            buttons: [[btn]],
          },
        },
        TranslationKeys.NoActiveSubscription,
        prefix,
      );
    } else {
      await this.sendMessage(
        model.chatId,
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
  }

  private async sendSubscribedMessage(
    subscription: ActiveSubscriptionItem,
    prefix: TelegramMessagePrefix,
    model: BotMessageModel,
    lang: LanguageCode,
    messageId?: MessageId,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending subscription info`);

    const translationId: TranslationKeyFull = subscription.isStopped
      ? [
          TranslationKeys.HasActiveSubscriptionEnds,
          {
            date: this.text.date(subscription.endDate, lang),
          },
        ]
      : [
          TranslationKeys.HasActiveSubscription,
          {
            date: this.text.date(subscription.endDate, lang),
            amount: String(subscription.amount),
          },
        ];

    const button = getSubscriptionButton("u", prefix.id);

    const btn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnUnsubscribe, lang),
      callback_data: button.getDtoString(),
    };

    if (messageId) {
      await this.editMessage(
        model.chatId,
        messageId,
        {
          lang,
          options: {
            buttons: [[btn]],
          },
        },
        translationId,
        prefix,
      );
    } else {
      await this.sendMessage(
        model.chatId,
        [translationId],
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

  private async autoSubscribe(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
  ) {
    if (!mdl.userId) {
      throw new Error("UserId is not defined!");
    }
    const row = await this.stat.enableSubscription(
      mdl.chatId,
      mdl.userId,
      subscriptionPrice,
    );
    logger.info(
      `${prefix.getPrefix()} Subscriptions has been activated ${lang}`,
    );
    addSubscriptionCacheItem(row);
  }
}
