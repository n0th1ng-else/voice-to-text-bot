import { Pool } from "pg";
import { nanoid } from "nanoid";

export interface NodeRowScheme {
  node_id: string;
  self_url: string;
  is_active: boolean;
  version: string;
  created_at: Date;
  updated_at: Date;
}

export class NodesDb {
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  public init(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS nodes (
        node_id varchar(20) PRIMARY KEY,
        self_url text UNIQUE NOT NULL,
        is_active boolean NOT NULL,
        version varchar(100) NOT NULL,
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
    selfUrl: string,
    isActive: boolean,
    version: string
  ): Promise<NodeRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table nodes is not initialized yet")
      );
    }
    const query = `
      INSERT INTO nodes(node_id, self_url, is_active, version, created_at, updated_at) 
      VALUES($1, $2, $3, $4, $5, $6)
      RETURNING node_id, self_url, is_active, version, created_at, updated_at;
    `;
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

  public updateRow(
    nodeId: string,
    isActive: boolean,
    version: string
  ): Promise<NodeRowScheme> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table nodes is not initialized yet")
      );
    }
    const query = `
      UPDATE nodes SET
        is_active=$1,
        version=$2,
        updated_at=$3
      WHERE node_id=$4
      RETURNING node_id, self_url, is_active, version, created_at, updated_at;
    `;
    const updatedAt = new Date();
    const values = [isActive, version, updatedAt, nodeId];
    return this.pool.query<NodeRowScheme>(query, values).then((queryData) => {
      const firstRow = queryData.rows.shift();
      if (!firstRow) {
        return Promise.reject(
          new Error("Row not found. No update was applied")
        );
      }
      return firstRow;
    });
  }

  public getRows(selfUrl: string): Promise<NodeRowScheme[]> {
    if (!this.initialized) {
      return Promise.reject(
        new Error("The table nodes is not initialized yet")
      );
    }
    const query = `
      SELECT node_id, self_url, is_active, version, created_at, updated_at 
      FROM nodes 
      WHERE self_url=$1 
      ORDER BY created_at;
    `;
    const values = [selfUrl];
    return this.pool
      .query<NodeRowScheme>(query, values)
      .then((queryData) => queryData.rows);
  }

  public getId(row: NodeRowScheme): string {
    return row.node_id;
  }
}
