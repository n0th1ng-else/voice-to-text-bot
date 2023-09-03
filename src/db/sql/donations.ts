import type { Pool } from "pg";
import { DonationsSql } from "./donations.sql.js";

export enum DonationStatus {
  Initialized = "INITIALIZED",
  Pending = "PENDING",
  Canceled = "CANCELED",
  Received = "RECEIVED",
}

export type DonationRowScheme = {
  donation_id: number;
  status: string;
  chat_id: number;
  price: number;
  created_at: Date;
  updated_at: Date;
};

export class DonationsDb {
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  public init(): Promise<void> {
    const query = DonationsSql.createTable;
    const values = [];
    return this.pool.query(query, values).then(() => {
      this.initialized = true;
    });
  }

  public createRow(chatId: number, price: number): Promise<DonationRowScheme> {
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
    status: DonationStatus,
  ): Promise<DonationRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table donations is not initialized yet"),
      );
    }
    const query = DonationsSql.updateRow;
    const updatedAt = new Date();
    const values = [status, updatedAt, donationId];
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

  public getId(row: DonationRowScheme): number {
    return row.donation_id;
  }
}
