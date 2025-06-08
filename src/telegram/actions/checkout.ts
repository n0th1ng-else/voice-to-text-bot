import { GenericAction } from "./common.js";
import { DonationStatus } from "../../db/sql/donations.js";
import { Logger } from "../../logger/index.js";
import { parseDonationPayload } from "../helpers.js";
import { TelegramMessagePrefix } from "../types.js";
import type { BotMessageModel } from "../model.js";
import type { TgCheckoutQuery, TgMessage } from "../api/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";
import type { PaymentChargeId } from "../api/core.js";
import { trackDonation } from "../../monitoring/newrelic.js";

const logger = new Logger("telegram-bot");

export class CheckoutAction extends GenericAction {
  public async runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    this.trackDonation(mdl);
    const donationId = mdl.donationId;
    const chargeId = mdl.paymentChargeId;
    if (!donationId) {
      logger.error(
        `${prefix.getPrefix()} Unable to parse the donationId in runAction. Will not update the DB row!`,
        new Error("Unable to parse the donationId in runAction"),
      );
      return Promise.resolve();
    }
    return this.markAsSuccessful(donationId, prefix, chargeId);
  }

  public async runCondition(
    _msg: TgMessage,
    mdl: BotMessageModel,
  ): Promise<boolean> {
    const isPayment = Boolean(mdl.paymentChargeId);
    const isSubscription = mdl.isSubscriptionPayment;
    return Promise.resolve(isPayment && !isSubscription);
  }

  public async confirmCheckout(
    msg: TgCheckoutQuery,
    analytics: AnalyticsData,
  ): Promise<void> {
    analytics.addPageVisit();
    const {
      donationId,
      chatId,
      prefix: prefixId,
    } = parseDonationPayload(msg.invoice_payload);
    const prefix = new TelegramMessagePrefix(chatId, prefixId);

    return this.bot.payments
      .answerPreCheckoutQuery(chatId, msg.id)
      .then(() => {
        if (!donationId) {
          logger.error(
            `${prefix.getPrefix()} Unable to parse the donationId in confirmCheckout. Will not update the DB row!`,
            new Error("Unable to parse the donationId in confirmCheckout"),
          );
          return;
        }
        return this.markAsPending(donationId, prefix);
      })
      .catch((err) => {
        logger.error(`${prefix.getPrefix()} Unable to confirm checkout.`, err);
      });
  }

  private async markAsPending(
    donationId: number,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    return this.stat
      .updateDonationRow(donationId, DonationStatus.Pending)
      .then(() => {
        logger.info(`${prefix.getPrefix()} Donation marked as PENDING`);
      })
      .catch((err) => {
        logger.error(
          `${prefix.getPrefix()} Unable to update the donation`,
          err,
        );
      });
  }

  private async markAsSuccessful(
    donationId: number,
    prefix: TelegramMessagePrefix,
    paymentChargeId?: PaymentChargeId,
  ): Promise<void> {
    return this.stat
      .updateDonationRow(donationId, DonationStatus.Received, paymentChargeId)
      .then(() => {
        logger.info(`${prefix.getPrefix()} Donation marked as SUCCESSFUL`);
      })
      .catch((err) => {
        logger.error(
          `${prefix.getPrefix()} Unable to update the donation`,
          err,
        );
      });
  }

  private trackDonation(model: BotMessageModel): void {
    if (!model.paymentAmount || !model.paymentCurrency) {
      return;
    }

    trackDonation(
      {
        activityType: "success",
        amount: model.paymentAmount,
        currency: model.paymentCurrency,
      },
      model.userId,
    );
  }
}
