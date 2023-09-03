import type { Pool } from "pg";
import { IgnoredChatsSql } from "./ignoredchats.sql.js";

export type IgnoredChatsRowScheme = {
  row_id: string;
  chat_id: number;
  ignore: boolean;
  created_at: Date;
  updated_at: Date;
};

export class IgnoredChatsDb {
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  public init(): Promise<void> {
    const query = IgnoredChatsSql.createTable;
    const values = [];
    return this.pool.query(query, values).then(() => {
      this.initialized = true;
    });
  }

  public getRow(chatId: number): Promise<IgnoredChatsRowScheme | null> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table ignoredchats is not initialized yet"),
      );
    }
    const query = IgnoredChatsSql.getRows;
    const values = [chatId];
    return this.pool
      .query<IgnoredChatsRowScheme>(query, values)
      .then((queryData) => {
        const row = queryData.rows.shift();
        return row ?? null;
      });
  }

  public getId(row: IgnoredChatsRowScheme): string {
    return row.row_id;
  }
}
