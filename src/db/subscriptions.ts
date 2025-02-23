import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import {
  SubscriptionDb,
  type SubscriptionRowScheme,
  SubscriptionStatus,
} from "./sql/subscriptions.js";

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

  public async getActiveRows(): Promise<SubscriptionRowScheme[]> {
    try {
      this.logInfo(`Looking for rows for status=${SubscriptionStatus.Active}`);
      const rows = await this.db.getRows(SubscriptionStatus.Active);
      this.logInfo(
        `Row search has been executed for status=${SubscriptionStatus.Active}`,
      );
      return rows;
    } catch (err) {
      logger.error(
        `Unable provide a search for status=${SubscriptionStatus.Active}`,
        err,
      );
      throw err;
    }
  }

  public setSecondary(): void {
    this.secondary = true;
  }

  public getRowId(row: SubscriptionRowScheme): number {
    return this.db.getId(row);
  }

  private logInfo(message: string): void {
    if (this.secondary) {
      return;
    }

    logger.info(message);
  }
}
