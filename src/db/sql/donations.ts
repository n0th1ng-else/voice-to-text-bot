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

  public async createRow(
    chatId: ChatId,
    price: number,
    currency: Currency,
  ): Promise<DonationRowScheme> {
    if (!this.initialized) {
      throw new Error("The table donations is not initialized yet");
    }
    const query = DonationsSql.insertRow;
    const createdAt = new Date();
    const updatedAt = createdAt;
    const status: DonationStatus = "INITIALIZED";
    const values = [chatId, status, price, currency, createdAt, updatedAt];

    const queryData = await this.pool.query<DonationRowScheme>(query, values);
    const firstRow = queryData.rows.shift();
    if (!firstRow) {
      throw new Error("Unable to get created row info");
    }
    return firstRow;
  }

  public async updateRow(
    donationId: DonationId,
    status: DonationStatus,
    paymentChargeId?: PaymentChargeId,
  ): Promise<DonationRowScheme> {
    if (!this.initialized) {
      throw new Error("The table donations is not initialized yet");
    }
    const query = DonationsSql.updateRow;
    const updatedAt = new Date();
    const values = [status, paymentChargeId, updatedAt, donationId];
    const queryData = await this.pool.query<DonationRowScheme>(query, values);
    const firstRow = queryData.rows.shift();
    if (!firstRow) {
      throw new Error("Unable to get updated row info");
    }
    return firstRow;
  }

  public async getRows(status: DonationStatus): Promise<DonationRowScheme[]> {
    if (!this.initialized) {
      throw new Error("The table donations is not initialized yet");
    }
    const query = DonationsSql.getRows;
    const values = [status];
    const queryData = await this.pool.query<DonationRowScheme>(query, values);
    return queryData.rows;
  }

  public getId(row: DonationRowScheme): DonationId {
    return row.donation_id;
  }
}
