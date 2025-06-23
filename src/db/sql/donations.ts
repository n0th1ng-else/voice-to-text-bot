import { CoreDbClient } from "./core-db.js";
import { DonationsSql } from "./donations.sql.js";
import type { ValueOf } from "../../common/types.js";
import type { ChatId, PaymentChargeId } from "../../telegram/api/core.js";
import type { Currency } from "../../telegram/api/groups/payments/payments-types.js";

export const DonationStatus = {
  Initialized: "INITIALIZED",
  Pending: "PENDING",
  Canceled: "CANCELED",
  Received: "RECEIVED",
} as const;

export type DonationStatusType = ValueOf<typeof DonationStatus>;

export type DonationRowScheme = {
  donation_id: number;
  status: string;
  chat_id: number;
  price: number;
  currency?: Currency;
  charge_id?: PaymentChargeId;
  created_at: Date;
  updated_at: Date;
};

export class DonationsDb extends CoreDbClient {
  public async init(): Promise<void> {
    const query = DonationsSql.createTable;
    await this.pool.query(query);
    const migration_22032025_1 = DonationsSql.migration_22032025_1;
    await this.pool.query(migration_22032025_1);
    const migration_22032025_2 = DonationsSql.migration_22032025_2;
    await this.pool.query(migration_22032025_2);
    this.initialized = true;
  }

  public createRow(
    chatId: ChatId,
    price: number,
    currency: Currency,
  ): Promise<DonationRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table donations is not initialized yet"),
      );
    }
    const query = DonationsSql.insertRow;
    const createdAt = new Date();
    const updatedAt = createdAt;
    const values = [
      chatId,
      DonationStatus.Initialized,
      price,
      currency,
      createdAt,
      updatedAt,
    ];
    return this.pool
      .query<DonationRowScheme>(query, values)
      .then((queryData) => {
        const firstRow = queryData.rows.shift();
        if (!firstRow) {
          return Promise.reject(new Error("Unable to get created row info"));
        }
        return firstRow;
      });
  }

  public updateRow(
    donationId: number,
    status: DonationStatusType,
    paymentChargeId?: PaymentChargeId,
  ): Promise<DonationRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table donations is not initialized yet"),
      );
    }
    const query = DonationsSql.updateRow;
    const updatedAt = new Date();
    const values = [status, paymentChargeId, updatedAt, donationId];
    return this.pool
      .query<DonationRowScheme>(query, values)
      .then((queryData) => {
        const firstRow = queryData.rows.shift();
        if (!firstRow) {
          return Promise.reject(new Error("Unable to get updated row info"));
        }
        return firstRow;
      });
  }

  public getRows(status: DonationStatusType): Promise<DonationRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table donations is not initialized yet"),
      );
    }
    const query = DonationsSql.getRows;
    const values = [status];
    return this.pool
      .query<DonationRowScheme>(query, values)
      .then((queryData) => queryData.rows);
  }

  public getId(row: DonationRowScheme): number {
    return row.donation_id;
  }
}
