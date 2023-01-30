import type { Pool } from "pg";
import { UsedEmailsSql } from "./emails.sql.js";

export interface UsedEmailRowScheme {
  email_id: number;
  email: string;
  start_at: Date;
  stop_at: Date;
}

export class UsedEmailDb {
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  public init(): Promise<void> {
    const query = UsedEmailsSql.createTable;
    const values = [];
    return this.pool.query(query, values).then(() => {
      this.initialized = true;
    });
  }

  public createRow(email: string): Promise<UsedEmailRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usedemails is not initialized yet")
      );
    }
    const query = UsedEmailsSql.insertRow;
    const startAt = new Date();

    const values = [email, startAt];
    return this.pool
      .query<UsedEmailRowScheme>(query, values)
      .then((queryData) => {
        const firstRow = queryData.rows.shift();
        if (!firstRow) {
          return Promise.reject(new Error("Unable to get created row info"));
        }
        return firstRow;
      });
  }

  public updateRow(emailId: number): Promise<UsedEmailRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usedemails is not initialized yet")
      );
    }
    const query = UsedEmailsSql.updateRow;
    const stopAt = new Date();

    const values = [stopAt, emailId];
    return this.pool
      .query<UsedEmailRowScheme>(query, values)
      .then((queryData) => {
        const firstRow = queryData.rows.shift();
        if (!firstRow) {
          return Promise.reject(new Error("Unable to get updated row info"));
        }
        return firstRow;
      });
  }

  public getRows(email: string): Promise<UsedEmailRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usedemails is not initialized yet")
      );
    }
    const query = UsedEmailsSql.getRows;
    const values = [email];
    return this.pool
      .query<UsedEmailRowScheme>(query, values)
      .then((queryData) => queryData.rows);
  }

  public getId(row: UsedEmailRowScheme): number {
    return row.email_id;
  }
}
