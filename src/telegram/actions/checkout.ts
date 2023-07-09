import { GenericAction } from "./common.js";
import { TgCheckoutQuery, TgMessage } from "../api/types.js";
import { BotMessageModel, TelegramMessagePrefix } from "../types.js";
import { AnalyticsData } from "../../analytics/ga/types.js";
import { DonationStatus } from "../../db/sql/donations.js";
import { Logger } from "../../logger/index.js";
import { parseDonationPayload } from "../helpers.js";

const logger = new Logger("telegram-bot");

export class CheckoutAction extends GenericAction {
  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    const donationId = mdl.donationId;
    if (!donationId) {
      logger.error(
        `${prefix.getPrefix()} Unable to parse the donationId in runAction. Will not update the DB row!`,
        new Error("Unable to parse the donationId in runAction"),
      );
      return Promise.resolve();
    }
    return this.markAsSuccessful(donationId, prefix);
  }

  public runCondition(msg: TgMessage): boolean {
    return Boolean(msg.successful_payment);
  }

  public confirmCheckout(
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

    return this.bot
      .answerPreCheckoutQuery(msg.id)
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

  private markAsPending(
    donationId: number,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    return this.stat.donations
      .updateRow(donationId, DonationStatus.Pending)
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

  private markAsSuccessful(
    donationId: number,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    return this.stat.donations
      .updateRow(donationId, DonationStatus.Received)
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
}
