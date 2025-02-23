import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import {
  SubscriptionDb,
  type SubscriptionRowScheme,
} from "./sql/subscriptions.js";
import type { ChatId, UserId } from "../telegram/api/core.js";
import { subscriptionDurationDays } from "../const.js";

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
      const currentDate = new Date();
      this.logInfo("Looking for rows with endDate in the future");
      const rows = await this.db.getRows(currentDate);
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

  public async create(
    chatId: ChatId,
    userId: UserId,
    amount: number,
  ): Promise<SubscriptionRowScheme> {
    try {
      this.logInfo(`Creating a row in ${Logger.y("subscriptions")}`);
      const row = await this.db.createRow(
        chatId,
        userId,
        amount,
        subscriptionDurationDays,
      );
      this.logInfo(`The row in ${Logger.y("subscriptions")} has been created`);
      return row;
    } catch (err) {
      logger.error(
        `Failed to create a row in ${Logger.y("subscriptions")}`,
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
