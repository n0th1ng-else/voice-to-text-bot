import { nanoid } from "nanoid";
import { ClientDb } from "./clientDb.js";
import { SubscriptionsSql } from "./subscriptions.sql.js";
import type { ChatId, UserId } from "../../telegram/api/core.js";
import type { Currency } from "../../telegram/api/groups/payments/payments-types.js";

export type SubscriptionRowScheme = {
  subscription_id: number;
  chat_id: ChatId;
  user_id: UserId;
  amount: number;
  currency: Currency;
  is_stopped: boolean;
  start_date: Date;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
};

export class SubscriptionDb extends ClientDb {
  public async init(): Promise<void> {
    const query = SubscriptionsSql.createTable;
    await this.pool.query(query);
    this.initialized = true;
  }

  public async getRows(endDate: Date): Promise<SubscriptionRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table subscriptions is not initialized yet"),
      );
    }
    const query = SubscriptionsSql.getRows;
    const values = [endDate];
    const queryData = await this.pool.query<SubscriptionRowScheme>(
      query,
      values,
    );
    return queryData.rows;
  }

  public async createRow(
    chatId: ChatId,
    userId: UserId,
    amount: number,
    durationSeconds: number,
  ): Promise<SubscriptionRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table subscriptions is not initialized yet"),
      );
    }
    const query = SubscriptionsSql.insertRow;
    const subscriptionId = nanoid(15);
    const createdAt = new Date();
    const startedAt = createdAt;
    const updatedAt = createdAt;
    const endedAt = new Date();
    endedAt.setSeconds(endedAt.getSeconds() + durationSeconds);

    const isStopped = false;

    const values = [
      subscriptionId,
      chatId,
      userId,
      amount,
      "XTR",
      startedAt,
      endedAt,
      isStopped,
      createdAt,
      updatedAt,
    ];
    return this.pool
      .query<SubscriptionRowScheme>(query, values)
      .then((queryData) => {
        const firstRow = queryData.rows.shift();
        if (!firstRow) {
          return Promise.reject(new Error("Unable to get created row info"));
        }
        return firstRow;
      });
  }

  public getId(row: SubscriptionRowScheme): number {
    return row.subscription_id;
  }
}
