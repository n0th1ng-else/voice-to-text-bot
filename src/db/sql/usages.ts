import { Pool } from "pg";
import { nanoid } from "nanoid";
import { UsagesSql } from "./usages.sql";

export interface UsageRowScheme {
  usage_id: string;
  chat_id: number;
  user_name: string;
  usage_count: number;
  lang_id: string;
  created_at: Date;
  updated_at: Date;
}

export class UsagesDb {
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  public init(): Promise<void> {
    const query = UsagesSql.createTable;
    const values = [];
    return this.pool.query(query, values).then(() => {
      this.initialized = true;
    });
  }

  public createRow(
    chatId: number,
    langId: string,
    username: string,
    usageCount: number
  ): Promise<UsageRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usages is not initialized yet")
      );
    }

    const query = UsagesSql.insertRow;
    const usageId = nanoid(15);
    const createdAt = new Date();
    const updatedAt = createdAt;
    const values = [
      usageId,
      chatId,
      username,
      usageCount,
      langId,
      createdAt,
      updatedAt,
    ];
    return this.pool.query<UsageRowScheme>(query, values).then((queryData) => {
      const firstRow = queryData.rows.shift();
      if (!firstRow) {
        return Promise.reject(new Error("Unable to get created row info"));
      }
      return firstRow;
    });
  }

  public updateRow(
    usageId: string,
    langId: string,
    usageCount: number,
    username: string
  ): Promise<UsageRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usages is not initialized yet")
      );
    }
    const query = UsagesSql.updateRow;
    const updatedAt = new Date();
    const values = [username, usageCount, langId, updatedAt, usageId];
    return this.pool.query<UsageRowScheme>(query, values).then((queryData) => {
      const firstRow = queryData.rows.shift();
      if (!firstRow) {
        return Promise.reject(new Error("Unable to get updated row info"));
      }
      return firstRow;
    });
  }

  /**
   * @deprecated Use it only for migration
   */
  public updateRowWithDate(
    usageId: string,
    langId: string,
    usageCount: number,
    username: string,
    createdAt: Date,
    updatedAt: Date
  ): Promise<UsageRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usages is not initialized yet")
      );
    }
    const query = UsagesSql.updateRowWithDate;
    const values = [
      username,
      usageCount,
      langId,
      createdAt,
      updatedAt,
      usageId,
    ];
    return this.pool.query<UsageRowScheme>(query, values).then((queryData) => {
      const firstRow = queryData.rows.shift();
      if (!firstRow) {
        return Promise.reject(new Error("Unable to get updated row info"));
      }
      return firstRow;
    });
  }

  public getRows(chatId: number): Promise<UsageRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usages is not initialized yet")
      );
    }

    const query = UsagesSql.getRows;
    const values = [chatId];
    return this.pool
      .query<UsageRowScheme>(query, values)
      .then((queryData) => queryData.rows);
  }

  public getId(row: UsageRowScheme): string {
    return row.usage_id;
  }
}
