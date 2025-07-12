import { nanoid } from "nanoid";
import { CoreDbClient } from "./core-db.js";
import { UsagesSql } from "./usages.sql.js";
import type { ChatId } from "../../telegram/api/core.js";
import type { UsageId } from "./types.js";

export type UsageRowScheme = {
  usage_id: UsageId;
  chat_id: ChatId;
  user_name: string;
  usage_count: number;
  lang_id: string;
  created_at: Date;
  updated_at: Date;
};

export class UsagesDb extends CoreDbClient {
  public async init(): Promise<void> {
    const query = UsagesSql.createTable;
    return this.pool.query(query).then(() => {
      this.initialized = true;
    });
  }

  public async createRow(
    chatId: ChatId,
    langId: string,
    username: string,
    usageCount: number,
  ): Promise<UsageRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usages is not initialized yet"),
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

  public async updateRow(
    usageId: UsageId,
    langId: string,
    usageCount: number,
    username: string,
  ): Promise<UsageRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usages is not initialized yet"),
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
  public async updateRowWithDate(
    usageId: UsageId,
    langId: string,
    usageCount: number,
    username: string,
    createdAt: Date,
    updatedAt: Date,
  ): Promise<UsageRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usages is not initialized yet"),
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

  public async getRows(chatId: ChatId): Promise<UsageRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table usages is not initialized yet"),
      );
    }

    const query = UsagesSql.getRows;
    const values = [chatId];
    return this.pool
      .query<UsageRowScheme>(query, values)
      .then((queryData) => queryData.rows);
  }

  public getId(row: UsageRowScheme): UsageId {
    return row.usage_id;
  }

  /**
   * @deprecated Use it only for chart
   */
  public async statRows(
    from: Date,
    to: Date,
    usageCountFrom: number,
  ): Promise<UsageRowScheme[]> {
    const query = UsagesSql.statRows;
    const values = [usageCountFrom, from, to];
    return this.pool
      .query<UsageRowScheme>(query, values)
      .then((queryData) => queryData.rows);
  }
}
