import { Pool } from "pg";
import { SuperusersSql } from "./superusers.sql";

export interface SuperusersRowScheme {
  user_id: number;
  chat_id: string;
  token: string;
  created_at: Date;
}

export class SuperusersDb {
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  public init(): Promise<void> {
    const query = SuperusersSql.createTable;
    const values = [];
    return this.pool.query(query, values).then(() => {
      this.initialized = true;
    });
  }

  public getRows(): Promise<SuperusersRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table superusers is not initialized yet")
      );
    }
    const query = SuperusersSql.getRows;
    const values = [];
    return this.pool
      .query<SuperusersRowScheme>(query, values)
      .then((queryData) => queryData.rows);
  }

  public getId(row: SuperusersRowScheme): number {
    return row.user_id;
  }
}
