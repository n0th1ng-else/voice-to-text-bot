import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import {
  SubscriptionDb,
  type SubscriptionRowScheme,
} from "./sql/subscriptions.js";
import type { PaymentChargeId, UserId } from "../telegram/api/core.js";
import type { Currency } from "../telegram/api/groups/payments/payments-types.js";
import type { SubscriptionId } from "./sql/types.js";

const logger = new Logger("postgres-subscriptions");

export class SubscriptionsClient {
  private readonly db: SubscriptionDb;
  private secondary = false;

  constructor(pool: Pool) {
    this.db = new SubscriptionDb(pool);
  }

  public async init(): Promise<void> {
    try {
      this.logInfo("Initializing the table");
      await this.db.init();
      this.logInfo(`Table ${Logger.y("subscriptions")} has been initialized`);
    } catch (err) {
      logger.error(
        `Unable to initialize ${Logger.y("subscriptions")} table`,
        err,
      );
      throw err;
    }
  }

  public async getRowsByDate(endData: Date): Promise<SubscriptionRowScheme[]> {
    try {
      this.logInfo("Looking for rows with endDate in the future");
      const rows = await this.db.getRowsByDate(endData);
      this.logInfo(
        "Row search has been executed for rows with endDate in the future",
      );
      return rows;
    } catch (err) {
      logger.error(
        "Unable provide a search for rows with endDate in the future",
        err,
      );
      throw err;
    }
  }

  public async getRowsByUserId(
    userId: UserId,
    limit: number,
  ): Promise<SubscriptionRowScheme[]> {
    try {
      this.logInfo(`Looking for rows with userId=${userId}`);
      const rows = await this.db.getRowsByUserId(userId, limit);
      this.logInfo(
        `Row search has been executed for rows with userId=${userId}`,
      );
      return rows;
    } catch (err) {
      logger.error(
        `Unable provide a search for rows with userId=${userId}`,
        err,
      );
      throw err;
    }
  }

  public async createRow(
    userId: UserId,
    chargeId: PaymentChargeId,
    endDate: Date,
    amount: number,
    currency: Currency,
    isTrial: boolean,
  ): Promise<SubscriptionRowScheme> {
    try {
      this.logInfo("Creating a new row");
      const row = await this.db.createRow(
        userId,
        chargeId,
        endDate,
        amount,
        currency,
        isTrial,
      );
      const subscriptionId = this.getRowId(row);
      this.logInfo(`The row with id=${subscriptionId} has been created`);
      return row;
    } catch (err) {
      logger.error("Unable to create a row", err);
      throw err;
    }
  }

  public async markAsCanceled(
    subscriptionId: SubscriptionId,
  ): Promise<SubscriptionRowScheme> {
    this.logInfo(`Updating the row with id=${subscriptionId}`);
    try {
      const row = await this.db.markRowAsCanceled(subscriptionId);
      this.logInfo(`The row with id=${subscriptionId} has been updated`);
      return row;
    } catch (err) {
      logger.error(`Unable to update the row with id=${subscriptionId}`, err);
      throw err;
    }
  }

  public setSecondary(): void {
    this.secondary = true;
  }

  public getRowId(row: SubscriptionRowScheme): SubscriptionId {
    return this.db.getId(row);
  }

  private logInfo(message: string): void {
    if (this.secondary) {
      return;
    }

    logger.info(message);
  }
}
