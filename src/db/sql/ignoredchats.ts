import { CoreDbClient } from "./core-db.js";
import { IgnoredChatsSql } from "./ignoredchats.sql.js";
import type { ChatId } from "../../telegram/api/core.js";
import type { IgnoredChatId } from "./types.js";

export type IgnoredChatsRowScheme = {
  row_id: IgnoredChatId;
  chat_id: ChatId;
  ignore: boolean;
  created_at: Date;
  updated_at: Date;
};

export class IgnoredChatsDb extends CoreDbClient {
  public async init(): Promise<void> {
    const query = IgnoredChatsSql.createTable;
    return this.pool.query(query).then(() => {
      this.initialized = true;
    });
  }

  public async getRow(chatId: ChatId): Promise<IgnoredChatsRowScheme | null> {
    if (!this.initialized) {
      return Promise.reject(new Error("The table ignoredchats is not initialized yet"));
    }
    const query = IgnoredChatsSql.getRows;
    const values = [chatId];
    return this.pool.query<IgnoredChatsRowScheme>(query, values).then((queryData) => {
      const row = queryData.rows.shift();
      return row ?? null;
    });
  }

  public getId(row: IgnoredChatsRowScheme): IgnoredChatId {
    return row.row_id;
  }
}
