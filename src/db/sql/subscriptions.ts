import type { ValueOf } from "../../common/types.js";
import { ClientDb } from "./clientDb.js";
import { SubscriptionsSql } from "./subscriptions.sql.js";

export const SubscriptionStatus = {
  Active: "ACTIVE",
};

export type SubscriptionStatusType = ValueOf<typeof SubscriptionStatus>;

export type SubscriptionRowScheme = {
  subscription_id: number;
  status: string;
  chat_id: number;
  started_by: number;
  started_at: Date;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export class SubscriptionDb extends ClientDb {
  public async init(): Promise<void> {
    const query = SubscriptionsSql.createTable;
    await this.pool.query(query);
    this.initialized = true;
  }

  public async getRows(
    status: SubscriptionStatusType,
  ): Promise<SubscriptionRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table subscriptions is not initialized yet"),
      );
    }
    const query = SubscriptionsSql.getRows;
    const values = [status];
    const queryData = await this.pool.query<SubscriptionRowScheme>(
      query,
      values,
    );
    return queryData.rows;
  }

  public getId(row: SubscriptionRowScheme): number {
    return row.subscription_id;
  }
}
