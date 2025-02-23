import { nanoid } from "nanoid";
import { CoreDbClient } from "./core-db.js";
import { SubscriptionsSql } from "./subscriptions.sql.js";
import type { PaymentChargeId, UserId } from "../../telegram/api/core.js";
import type { Currency } from "../../telegram/api/groups/payments/payments-types.js";

export type SubscriptionRowScheme = {
  subscription_id: string;
  user_id: UserId;
  amount: number;
  currency: Currency;
  is_canceled: boolean;
  is_trial: boolean;
  charge_id: PaymentChargeId;
  start_date: Date;
  end_date: Date;
  created_at: Date;
  updated_at: Date;
};

export class SubscriptionDb extends CoreDbClient {
  public async init(): Promise<void> {
    const query = SubscriptionsSql.createTable;
    await this.pool.query(query);
    this.initialized = true;
  }

  public async getRowsByDate(endDate: Date): Promise<SubscriptionRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table subscriptions is not initialized yet"),
      );
    }
    const query = SubscriptionsSql.getRowsByDate;
    const values = [endDate];
    const queryData = await this.pool.query<SubscriptionRowScheme>(
      query,
      values,
    );
    return queryData.rows;
  }

  public async getRowsByUserId(
    userId: UserId,
    limit: number,
  ): Promise<SubscriptionRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table subscriptions is not initialized yet"),
      );
    }
    const query = SubscriptionsSql.getRowsByUserId;
    const values = [userId, limit];
    const queryData = await this.pool.query<SubscriptionRowScheme>(
      query,
      values,
    );
    return queryData.rows;
  }

  public async createRow(
    userId: UserId,
    chargeId: PaymentChargeId,
    renewalDate: Date,
    amount: number,
    currency: Currency,
    isTrial: boolean,
  ): Promise<SubscriptionRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table subscriptions is not initialized yet"),
      );
    }
    const query = SubscriptionsSql.insertRow;
    const subscriptionId = nanoid(15);
    const createdAt = new Date();
    const startedAt = new Date();
    const updatedAt = new Date();

    const isCanceled = false;

    const values = [
      subscriptionId,
      userId,
      amount,
      currency,
      startedAt,
      renewalDate,
      isCanceled,
      isTrial,
      chargeId,
      createdAt,
      updatedAt,
    ];

    const queryData = await this.pool.query<SubscriptionRowScheme>(
      query,
      values,
    );
    const firstRow = queryData.rows.shift();
    if (!firstRow) {
      return Promise.reject(new Error("Unable to get created row info"));
    }
    return firstRow;
  }

  public async markRowAsCanceled(
    subscriptionId: string,
  ): Promise<SubscriptionRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table subscriptions is not initialized yet"),
      );
    }

    const query = SubscriptionsSql.toggleCanceled;
    const isCanceled = true;
    const updatedAt = new Date();

    const values = [isCanceled, updatedAt, subscriptionId];

    const queryData = await this.pool.query<SubscriptionRowScheme>(
      query,
      values,
    );
    const firstRow = queryData.rows.shift();
    if (!firstRow) {
      return Promise.reject(new Error("Unable to get updated row info"));
    }
    return firstRow;
  }

  public getId(row: SubscriptionRowScheme): string {
    return row.subscription_id;
  }
}
