import { GenericAction } from "./common.js";
import { Logger } from "../../logger/index.js";
import { parsePaymentPayload } from "../helpers.js";
import { TelegramMessagePrefix } from "../types.js";
import type { BotMessageModel } from "../models/botMessage.js";
import type { TgCheckoutQuery, TgMessage } from "../api/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";
import type { PaymentChargeId } from "../api/core.js";
import { trackDonation } from "../../monitoring/newrelic.js";
import { isDonation } from "../../payments/helpers.js";
import type { DonationId } from "../../db/sql/types.js";

const logger = new Logger("telegram-bot");

export class CheckoutAction extends GenericAction {
  public async runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    this.trackDonation(mdl);
    const paymentInternalId = mdl.paymentInternalId;
    const chargeId = mdl.paymentChargeId;
    if (!paymentInternalId) {
      logger.error(
        `${prefix.getPrefix()} Unable to parse the paymentInternalId in runAction. Will not update the DB row!`,
        new Error("Unable to parse the paymentInternalId in runAction"),
      );
      return Promise.resolve();
    }
    // @ts-expect-error We unified the paymentId field, but will not change the donationId type
    return this.markAsSuccessful(Number(paymentInternalId), prefix, chargeId);
  }

  public async runCondition(
    _msg: TgMessage,
    mdl: BotMessageModel,
  ): Promise<boolean> {
    return Promise.resolve(isDonation(mdl));
  }

  public async confirmCheckout(
    msg: TgCheckoutQuery,
    analytics: AnalyticsData,
  ): Promise<void> {
    analytics.addPageVisit();
    const {
      paymentInternalId,
      chatId,
      prefix: prefixId,
    } = parsePaymentPayload(msg.invoice_payload);
    const prefix = new TelegramMessagePrefix(chatId, prefixId);

    return this.bot.payments
      .answerPreCheckoutQuery(chatId, msg.id)
      .then(() => {
        if (!paymentInternalId) {
          logger.error(
            `${prefix.getPrefix()} Unable to parse the paymentInternalId in confirmCheckout. Will not update the DB row!`,
            new Error(
              "Unable to parse the paymentInternalId in confirmCheckout",
            ),
          );
          return;
        }
        // @ts-expect-error We unified the paymentId field, but will not change the paymentInternalId type
        return this.markAsPending(Number(paymentInternalId), prefix);
      })
      .catch((err) => {
        logger.error(`${prefix.getPrefix()} Unable to confirm checkout.`, err);
      });
  }

  private async markAsPending(
    donationId: DonationId,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    return this.stat
      .updateDonationRow(donationId, "PENDING")
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
    donationId: DonationId,
    prefix: TelegramMessagePrefix,
    paymentChargeId?: PaymentChargeId,
  ): Promise<void> {
    return this.stat
      .updateDonationRow(donationId, "RECEIVED", paymentChargeId)
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
