import { GenericAction } from "./common.js";
import { Logger } from "../../logger/index.js";
import type { TelegramMessagePrefix } from "../types.js";
import type { BotMessageModel } from "../model.js";
import type { TgMessage } from "../api/types.js";
import { isSubscriptionPayment } from "../../payments/helpers.js";
import { TranslationKeys } from "../../text/types.js";
import { saveSubscriptionsCache } from "../../subscription/subscriptions.js";
import { getAsUserId } from "../../subscription/utils.js";

const logger = new Logger("telegram-bot");

export class SubscriptionChangeAction extends GenericAction {
  public async runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    const userId = getAsUserId(mdl);
    if (
      !mdl.paymentChargeId ||
      !mdl.paymentAmount ||
      !mdl.paymentCurrency ||
      !mdl.paymentNextDate
    ) {
      logger.error(
        `${prefix.getPrefix()} some data is missing for the successful subscription payment`,
        {
          chargeId: mdl.paymentChargeId,
          userId: mdl.userId,
          chatId: mdl.chatId,
          amound: mdl.paymentAmount,
          currency: mdl.paymentCurrency,
          nextDate: mdl.paymentNextDate,
        },
      );
      return;
    }

    try {
      const renewalAt = new Date(mdl.paymentNextDate);
      const row = await this.stat.createSubscription(
        userId,
        mdl.paymentChargeId,
        renewalAt,
        mdl.paymentAmount,
        mdl.paymentCurrency,
        false,
      );
      saveSubscriptionsCache(row);

      const lastTwoPeriods = await this.stat.getSubscriptionsByUserId(
        userId,
        2,
      );
      const previous = lastTwoPeriods.length > 1 && lastTwoPeriods.at(1);
      if (!previous || previous.is_canceled) {
        await this.sendActivatedMessage(mdl, prefix, row.end_date);
        return;
      }
      await this.sendRenewedMessage(mdl, prefix, row.end_date);
    } catch (err) {
      logger.error(
        `${prefix.getPrefix()} Failed to fetch the rows by userId`,
        err,
      );
    }
  }

  public async runCondition(
    _msg: TgMessage,
    mdl: BotMessageModel,
  ): Promise<boolean> {
    return Promise.resolve(isSubscriptionPayment(mdl));
  }

  private async sendActivatedMessage(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    renewalDate: Date,
  ) {
    const lang = await this.getChatLanguage(mdl, prefix);
    const date = this.text.date(renewalDate, lang);
    await this.sendMessage(
      mdl.chatId,
      [[TranslationKeys.SubscriptionActivated, { date }]],
      {
        lang,
      },
      prefix,
      mdl.forumThreadId,
    );
  }

  private async sendRenewedMessage(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
    renewalDate: Date,
  ) {
    const lang = await this.getChatLanguage(mdl, prefix);
    const date = this.text.date(renewalDate, lang);
    await this.sendMessage(
      mdl.chatId,
      [[TranslationKeys.SubscriptionRenewed, { date }]],
      {
        lang,
      },
      prefix,
      mdl.forumThreadId,
    );
  }
}
