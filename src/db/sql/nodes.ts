import type { Pool } from "pg";
import { nanoid } from "nanoid";
import { NodesSql } from "./nodes.sql.js";

export type NodeRowScheme = {
  node_id: string;
  self_url: string;
  is_active: boolean;
  version: string;
  created_at: Date;
  updated_at: Date;
};

export class NodesDb {
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  public async init(): Promise<void> {
    const query = NodesSql.createTable;
    return this.pool.query(query).then(() => {
      this.initialized = true;
    });
  }

  public async createRow(
    selfUrl: string,
    isActive: boolean,
    version: string,
  ): Promise<NodeRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table nodes is not initialized yet"),
      );
    }
    const query = NodesSql.insertRow;
    const nodeId = nanoid(15);
    const createdAt = new Date();
    const updatedAt = createdAt;
    const values = [nodeId, selfUrl, isActive, version, createdAt, updatedAt];
    return this.pool.query<NodeRowScheme>(query, values).then((queryData) => {
      const firstRow = queryData.rows.shift();
      if (!firstRow) {
        return Promise.reject(new Error("Unable to get created row info"));
      }
      return firstRow;
    });
  }

  public async updateRow(
    nodeId: string,
    isActive: boolean,
    version: string,
  ): Promise<NodeRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table nodes is not initialized yet"),
      );
    }
    const query = NodesSql.updateRow;
    const updatedAt = new Date();
    const values = [isActive, version, updatedAt, nodeId];
    return this.pool.query<NodeRowScheme>(query, values).then((queryData) => {
      const firstRow = queryData.rows.shift();
      if (!firstRow) {
        return Promise.reject(new Error("Unable to get updated row info"));
      }
      return firstRow;
    });
  }

  public async getRows(selfUrl: string): Promise<NodeRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table nodes is not initialized yet"),
      );
    }
    const query = NodesSql.getRows;
    const values = [selfUrl];
    return this.pool
      .query<NodeRowScheme>(query, values)
      .then((queryData) => queryData.rows);
  }

  public getId(row: NodeRowScheme): string {
    return row.node_id;
  }
}
