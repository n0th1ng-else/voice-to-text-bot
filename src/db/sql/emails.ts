import { CoreDbClient } from "./core-db.js";
import { UsedEmailsSql } from "./emails.sql.js";
import type { EmailId } from "./types.js";

export type UsedEmailRowScheme = {
  email_id: EmailId;
  email: string;
  start_at: Date;
  stop_at: Date;
};

export class UsedEmailDb extends CoreDbClient {
  public async init(): Promise<void> {
    const query = UsedEmailsSql.createTable;
    return this.pool.query(query).then(() => {
      this.initialized = true;
    });
  }

  public async createRow(email: string): Promise<UsedEmailRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usedemails is not initialized yet"),
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

  public async updateRow(emailId: EmailId): Promise<UsedEmailRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usedemails is not initialized yet"),
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

  public async getRows(email: string): Promise<UsedEmailRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usedemails is not initialized yet"),
      );
    }
    const query = UsedEmailsSql.getRows;
    const values = [email];
    return this.pool
      .query<UsedEmailRowScheme>(query, values)
      .then((queryData) => queryData.rows);
  }

  public getId(row: UsedEmailRowScheme): EmailId {
    return row.email_id;
  }
}
