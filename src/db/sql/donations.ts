import { z } from "zod";
import { CoreDbClient } from "./core-db.js";
import { DonationsSql } from "./donations.sql.js";
import type { ChatId, PaymentChargeId } from "../../telegram/api/core.js";
import type { Currency } from "../../telegram/api/groups/payments/payments-types.js";
import type { DonationId } from "./types.js";

export const DbDonationStatus = z
  .enum(["INITIALIZED", "PENDING", "CANCELED", "RECEIVED"])
  .describe("Supported donation status");

export type DonationStatus = z.infer<typeof DbDonationStatus>;

export type DonationRowScheme = {
  donation_id: DonationId;
  status: DonationStatus;
  chat_id: ChatId;
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
    const status: DonationStatus = "INITIALIZED";
    const values = [chatId, status, price, currency, createdAt, updatedAt];
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
    donationId: DonationId,
    status: DonationStatus,
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

  public getRows(status: DonationStatus): Promise<DonationRowScheme[]> {
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

  public getId(row: DonationRowScheme): DonationId {
    return row.donation_id;
  }
}
