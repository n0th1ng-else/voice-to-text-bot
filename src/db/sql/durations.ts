import type { Pool } from "pg";
import { nanoid } from "nanoid";
import { DurationsSql } from "./durations.sql.js";

export type DurationRowScheme = {
  duration_id: string;
  chat_id: number;
  duration: number;
  created_at: Date;
  updated_at: Date;
};

export class DurationsDb {
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  public init(): Promise<void> {
    const query = DurationsSql.createTable;
    const values = [];
    return this.pool.query(query, values).then(() => {
      this.initialized = true;
    });
  }

  public createRow(
    chatId: number,
    duration: number,
  ): Promise<DurationRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table durations is not initialized yet"),
      );
    }
    const query = DurationsSql.insertRow;
    const durationId = nanoid(15);
    const createdAt = new Date();
    const updatedAt = createdAt;
    const values = [durationId, chatId, duration, createdAt, updatedAt];
    return this.pool
      .query<DurationRowScheme>(query, values)
      .then((queryData) => {
        const row = queryData.rows.shift();
        if (!row) {
          return Promise.reject(new Error("Unable to get created row info"));
        }
        return row;
      });
  }

  public getId(row: DurationRowScheme): string {
    return row.duration_id;
  }
}
