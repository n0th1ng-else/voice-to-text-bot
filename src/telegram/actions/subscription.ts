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
import {
  subscriptionDurationSeconds,
  subscriptionPrice,
  subscriptionTrialDurationSeconds,
  subscriptionTrialPaymentId,
} from "../../const.js";
import type { TgMessage } from "../api/types.js";
import type { LanguageCode } from "../../recognition/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";
import type { ChatId, MessageId } from "../api/core.js";
import type { TgInlineKeyboardButton } from "../api/groups/chats/chats-types.js";
import { getAsUserId, isPremiumLanguage } from "../../subscription/utils.js";
import { BotMessageModel } from "../model.js";
import { isCommandMessage } from "../commandsChecker.js";
import { BotCommand } from "../commands.js";
import { telegramBotName } from "../../env.js";

const logger = new Logger("telegram-bot");

const SubscriptionBtnActionSchema = z
  .union([
    z.literal("u").describe("unsubscribe button clicked"),
    z.literal("-").describe("unsubscribe confirmed"),
    z.literal("b").describe("get back to subscription overview"),
    z.literal("t").describe("start trial button clicked"),
    z.literal("tc").describe("trial confirmed"),
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
      case "b":
        return await this.showSubscriptionOverview(
          model,
          prefix,
          lang,
          model.id,
        );
      case "-":
        return await this.cancelSubscription(model, prefix, lang);
      case "t":
        return await this.showConfirmTrial(model, prefix, lang);
      case "tc":
        return await this.startTrial(model, prefix, lang);
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
    const userId = getAsUserId(mdl);
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

    const backButton = getSubscriptionButton("b", prefix.id);
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
          buttons: [[unsubscribeBtn, backBtn]],
        },
      },
      translationId,
      prefix,
    );
  }

  private async showConfirmTrial(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
  ): Promise<void> {
    const userId = getAsUserId(mdl);
    const subscription = getSubscriptionFromCache(userId);

    if (subscription) {
      // TODO edit message to say that they have subscription
      return await this.showSubscriptionOverview(mdl, prefix, lang);
    }

    const backButton = getSubscriptionButton("b", prefix.id);
    const backBtn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnBack, lang),
      callback_data: backButton.getDtoString(),
    };

    const confirmTrialBtn = getSubscriptionButton("tc", prefix.id);
    const confirmBtn: TgInlineKeyboardButton = {
      text: this.text.t(TranslationKeys.BtnTrialConfirm, lang),
      callback_data: confirmTrialBtn.getDtoString(),
    };

    return await this.editMessage(
      mdl.chatId,
      mdl.id,
      {
        lang,
        options: {
          buttons: [[backBtn, confirmBtn]],
        },
      },
      [
        TranslationKeys.ConfirmSubscriptionTrial,
        {
          date: this.text.date(this.getTrialEndDate(), lang),
        },
      ],
      prefix,
    );
  }

  private async startTrial(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
  ): Promise<void> {
    const userId = getAsUserId(mdl);
    const subscription = getSubscriptionFromCache(userId);

    if (subscription) {
      // TODO edit message to say that they have subscription
      return await this.showSubscriptionOverview(mdl, prefix, lang);
    }

    const row = await this.stat.createSubscription(
      userId,
      subscriptionTrialPaymentId,
      this.getTrialEndDate(),
      0,
      "XTR",
      true,
    );
    saveSubscriptionsCache(row);

    await this.editMessage(
      mdl.chatId,
      mdl.id,
      {
        lang,
      },
      [
        TranslationKeys.TrialActivated,
        { date: this.text.date(row.end_date, lang) },
      ],
      prefix,
    );
  }

  private async showSubscriptionOverview(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    lang: LanguageCode,
    messageId?: MessageId,
  ): Promise<void> {
    const userId = getAsUserId(mdl);
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
    const userId = getAsUserId(mdl);
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
        true,
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
    const userId = getAsUserId(mdl);
    logger.info(`${prefix.getPrefix()} Sending an offer to subscribe`, {
      messageId: mdl.id,
      chatId: mdl.chatId,
      userId: mdl.userId,
    });

    const buttons: TgInlineKeyboardButton[][] = [
      [await this.getSubscribeButton(mdl.chatId, lang, false)],
    ];
    try {
      const hadPastSubscriptions = await this.stat.getSubscriptionsByUserId(
        userId,
        1,
      );
      if (!hadPastSubscriptions) {
        const startTrialBtn: TgInlineKeyboardButton = {
          text: this.text.t(TranslationKeys.BtnTrialStart, lang),
          callback_data: getSubscriptionButton("t", prefix.id).getDtoString(),
        };
        buttons.push([startTrialBtn]);
      }
    } catch (err) {
      logger.error(
        `${prefix.getPrefix()} Failed to check if the user has ever opted for trial`,
        err,
      );
    }

    if (messageId) {
      await this.editMessage(
        mdl.chatId,
        messageId,
        {
          lang,
          options: {
            buttons,
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
            buttons,
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

    const subscribeBtn = await this.getSubscribeButton(mdl.chatId, lang, true);
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
    hasOldSubscription: boolean,
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

    const translationId = hasOldSubscription
      ? TranslationKeys.BtnResubscribe
      : TranslationKeys.BtnSubscribe;
    const btn: TgInlineKeyboardButton = {
      text: this.text.t(translationId, lang),
      url,
    };

    return btn;
  }

  private getTrialEndDate(): Date {
    const trialDate = new Date(
      Date.now() + subscriptionTrialDurationSeconds * 1000,
    );
    return trialDate;
  }
}
