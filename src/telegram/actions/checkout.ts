import { GenericAction } from "./common.ts";
import { DonationStatus } from "../../db/sql/donations.ts";
import { Logger } from "../../logger/index.ts";
import { parseDonationPayload } from "../helpers.ts";
import { type BotMessageModel, TelegramMessagePrefix } from "../types.ts";
import type { TgCheckoutQuery, TgMessage } from "../api/types.ts";
import type { AnalyticsData } from "../../analytics/ga/types.ts";

const logger = new Logger("telegram-bot");

export class CheckoutAction extends GenericAction {
  public async runAction(
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

  public async runCondition(msg: TgMessage): Promise<boolean> {
    return Promise.resolve(Boolean(msg.successful_payment));
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
  ): Promise<void> {
    return this.stat
      .updateDonationRow(donationId, DonationStatus.Received)
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
