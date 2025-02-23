import { z } from "zod";
import { Logger } from "../../logger/index.js";
import { GenericAction } from "./common.js";
import { TelegramButtonModel, TelegramMessagePrefix } from "../types.js";
import { getBotLogo } from "../helpers.js";
import {
  type ActiveSubscriptionItem,
  getSubscriptionFromCache,
  saveSubscriptionsCache,
} from "../../subscription/subscriptions.js";
import { collectAnalytics } from "../../analytics/index.js";
import { type TranslationKeyFull, TranslationKeys } from "../../text/types.js";
import { subscriptionDurationSeconds, subscriptionPrice } from "../../const.js";
import type { TgMessage } from "../api/types.js";
import type { LanguageCode } from "../../recognition/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";
import type { ChatId, MessageId, UserId } from "../api/core.js";
import type { TgInlineKeyboardButton } from "../api/groups/chats/chats-types.js";
import { isPremiumLanguage } from "../../subscription/utils.js";
import { BotMessageModel } from "../model.js";
import { isCommandMessage } from "../commandsChecker.js";
import { BotCommand } from "../commands.js";
import { telegramBotName } from "../../env.js";

const logger = new Logger("telegram-bot");

const SubscriptionBtnActionSchema = z
  .union([
    z.literal("u").describe("unsubscribe button clicked"),
    z.literal("-").describe("unsubscribe confirmed"),
    z.literal("+").describe("get back to subscription overview"),
  ])
  .describe("Subscription action");

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
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending subscription message`);

    try {
      const lang = await this.getChatLanguage(mdl, prefix);
      if (mdl.isGroup) {
        await this.manageSubscriptionInDMs(mdl, prefix, lang);
      } else {
        await this.showSubscriptionOverview(mdl, prefix, lang);
      }
      logger.info(`${prefix.getPrefix()} Subscription message sent`);
    } catch (err) {
      const errorMessage = "Unable to send subscription message";
      logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
      mdl.analytics.addError(errorMessage);
    }

    await collectAnalytics(
      mdl.analytics.setCommand(
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
      default:
        throw new Error("Unknown button value");
    }
  }

  private async manageSubscriptionInDMs(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
  ): Promise<void> {
    await this.sendMessage(
      mdl.chatId,
      [
        [
          TranslationKeys.ManageSubscriptionInDMs,
          { name: `@${telegramBotName}` },
        ],
      ],
      {
        lang,
      },
      prefix,
      mdl.forumThreadId,
    );
  }

  private async showConfirmUnsubscribe(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
  ): Promise<void> {
    const userId = this.getUserId(mdl);
    const subscription = getSubscriptionFromCache(userId);

    if (!subscription) {
      throw new Error(
        "No subscription found. Unable to show the subscription details",
        {
          cause: { chatId: mdl.chatId, userId: mdl.userId },
        },
      );
    }

    if (subscription.isCanceled) {
      await this.cancelSubscription(mdl, prefix, lang);
      return;
    }

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

    const backButton = getSubscriptionButton("+", prefix.id);
    const backBtn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnBack, lang),
      callback_data: backButton.getDtoString(),
    };

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
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
    messageId?: MessageId,
  ): Promise<void> {
    const userId = this.getUserId(mdl);
    if (!userId) {
      throw new Error("No userId found for subscription overview", {
        cause: { chatId: mdl.chatId, userId: mdl.userId },
      });
    }

    const subscription = getSubscriptionFromCache(userId);
    if (!subscription) {
      await this.sendNotSubscribedMessage(prefix, mdl, lang, messageId);
    } else {
      await this.sendSubscribedMessage(
        subscription,
        prefix,
        mdl,
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
    const userId = this.getUserId(mdl);
    const subscription = getSubscriptionFromCache(userId);

    if (!subscription) {
      throw new Error("No subscription found. Unable to unsubscribe", {
        cause: { chatId: mdl.chatId, userId: mdl.userId },
      });
    }

    if (!subscription.isCanceled) {
      await this.bot.payments.editUserStarSubscription(
        mdl.chatId,
        userId,
        subscription.chargeId,
      );
      const changed = await this.stat.markSubscriptionAsCanceled(
        subscription.subscriptionId,
      );
      saveSubscriptionsCache(changed);
    }

    const date = this.text.date(subscription.endDate, lang);
    await this.editMessage(
      mdl.chatId,
      mdl.id,
      {
        lang,
      },
      [TranslationKeys.SubscriptionDeactivated, { date }],
      prefix,
    );
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
    mdl: BotMessageModel,
    lang: LanguageCode,
    messageId?: MessageId,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending an offer to subscribe`, {
      messageId: mdl.id,
      chatId: mdl.chatId,
    });

    const btn = await this.getSubscribeButton(mdl.chatId, lang);

    if (messageId) {
      await this.editMessage(
        mdl.chatId,
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
        mdl.chatId,
        [TranslationKeys.NoActiveSubscription],
        {
          lang,
          options: {
            buttons: [[btn]],
          },
        },
        prefix,
        mdl.forumThreadId,
      );
    }
  }

  private async sendSubscribedMessage(
    subscription: ActiveSubscriptionItem,
    prefix: TelegramMessagePrefix,
    mdl: BotMessageModel,
    lang: LanguageCode,
    messageId?: MessageId,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending subscription info`, {
      messageId: mdl.id,
      chatId: mdl.chatId,
    });

    const translationId: TranslationKeyFull = subscription.isCanceled
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

    const unsubscribeBtn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnUnsubscribe, lang),
      callback_data: button.getDtoString(),
    };

    const subscribeBtn = await this.getSubscribeButton(mdl.chatId, lang);
    const btn = subscription.isCanceled ? subscribeBtn : unsubscribeBtn;

    if (messageId) {
      await this.editMessage(
        mdl.chatId,
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
        mdl.chatId,
        [translationId],
        {
          lang,
          options: {
            buttons: [[btn]],
          },
        },
        prefix,
        mdl.forumThreadId,
      );
    }
  }

  private async getSubscribeButton(
    chatId: ChatId,
    lang: LanguageCode,
  ): Promise<TgInlineKeyboardButton> {
    // TODO fill in
    const url = await this.bot.payments.createInvoiceLink(chatId, {
      amount: subscriptionPrice,
      description: "description",
      label: "label",
      meta: "meta",
      payload: "payload",
      photo: getBotLogo(),
      subscriptionPeriod: subscriptionDurationSeconds,
      title: "unlock more languages",
    });

    const btn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnSubscribe, lang),
      url,
    };

    return btn;
  }

  private getUserId(mdl: BotMessageModel): UserId {
    // Subscriptions are only for direct messages, so userId === chatId
    const userId = mdl.chatId as unknown as UserId;
    return userId;
  }
}
