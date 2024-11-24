import type { Pool } from "pg";
import { IgnoredChatsSql } from "./ignoredchats.sql.ts";

export type IgnoredChatsRowScheme = {
  row_id: string;
  chat_id: number;
  ignore: boolean;
  created_at: Date;
  updated_at: Date;
};

export class IgnoredChatsDb {
  private initialized = false;
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async init(): Promise<void> {
    const query = IgnoredChatsSql.createTable;
    return this.pool.query(query).then(() => {
      this.initialized = true;
    });
  }

  public async getRow(chatId: number): Promise<IgnoredChatsRowScheme | null> {
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
