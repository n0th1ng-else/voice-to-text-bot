import { Pool } from "pg";
import { nanoid } from "nanoid";

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
    const query = `
      CREATE TABLE IF NOT EXISTS usages (
        usage_id varchar(20) PRIMARY KEY,
        chat_id bigint UNIQUE NOT NULL,
        user_name text NOT NULL,
        usage_count bigint NOT NULL,
        lang_id varchar(20) NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
    `;
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

    const query = `
      INSERT INTO usages(usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at) 
      VALUES($1, $2, $3, $4, $5, $6, $7)
      RETURNING usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at;
    `;
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
        return Promise.reject(new Error("Unable create the row"));
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
    const query = `
      UPDATE usages SET
        user_name=$1,
        usage_count=$2,
        lang_id=$3,
        updated_at=$4
      WHERE usage_id=$5
      RETURNING usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at;
    `;
    const updatedAt = new Date();
    const values = [username, usageCount, langId, updatedAt, usageId];
    return this.pool.query<UsageRowScheme>(query, values).then((queryData) => {
      const firstRow = queryData.rows.shift();
      if (!firstRow) {
        return Promise.reject(
          new Error("Row not found. No update was applied")
        );
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
    const query = `
      UPDATE usages SET
        user_name=$1,
        usage_count=$2,
        lang_id=$3,
        created_at=$4,
        updated_at=$5
      WHERE usage_id=$6
      RETURNING usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at;
    `;
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
        return Promise.reject(
          new Error("Row not found. No update was applied")
        );
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

    const query = `
      SELECT usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at 
      FROM usages 
      WHERE chat_id=$1 
      ORDER BY created_at;
    `;
    const values = [chatId];
    return this.pool
      .query<UsageRowScheme>(query, values)
      .then((queryData) => queryData.rows);
  }

  public getId(row: UsageRowScheme): string {
    return row.usage_id;
  }
}
