import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import { type NodeRowScheme, NodesDb } from "./sql/nodes.js";
import type { NodeInstanceId } from "./sql/types.js";

const logger = new Logger("postgres-nodes");

export class NodesClient {
  private readonly db: NodesDb;
  private secondary = false;

  constructor(pool: Pool) {
    this.db = new NodesDb(pool);
  }

  public init(): Promise<void> {
    this.logInfo("Initializing the table");
    return this.db
      .init()
      .then(() =>
        this.logInfo(`Table ${Logger.y("nodes")} has been initialized`),
      )
      .catch((err) => {
        logger.error(`Unable to initialize ${Logger.y("nodes")} table`, err);
        throw err;
      });
  }

  public setSecondary(): void {
    this.secondary = true;
  }

  public updateState(
    selfUrl: string,
    isActive: boolean,
    version: string,
  ): Promise<NodeRowScheme> {
    return this.getRows(selfUrl).then((rows) => {
      const row = rows.shift();
      if (row) {
        return this.updateRow(row.node_id, isActive, version);
      }
      return this.createRow(selfUrl, isActive, version);
    });
  }

  private updateRow(
    nodeId: NodeInstanceId,
    isActive: boolean,
    version: string,
  ): Promise<NodeRowScheme> {
    this.logInfo(`Updating the row with id=${nodeId}`);
    return this.db
      .updateRow(nodeId, isActive, version)
      .then((row) => {
        const id = this.db.getId(row);
        this.logInfo(
          `The row with id=${nodeId} has been updated ${id === nodeId}`,
        );
        return row;
      })
      .catch((err) => {
        logger.error(`Unable to update the row with id=${nodeId}`, err);
        throw err;
      });
  }

  private createRow(
    selfUrl: string,
    isActive: boolean,
    version: string,
  ): Promise<NodeRowScheme> {
    this.logInfo("Creating a new row");
    return this.db
      .createRow(selfUrl, isActive, version)
      .then((row) => {
        const nodeId = this.db.getId(row);
        this.logInfo(`The row with id=${nodeId} has been created`);
        return row;
      })
      .catch((err) => {
        logger.error("Unable to create a row", err);
        throw err;
      });
  }

  private getRows(selfUrl: string): Promise<NodeRowScheme[]> {
    this.logInfo(`Looking for rows for selfUrl=${selfUrl}`);
    return this.db
      .getRows(selfUrl)
      .then((rows) => {
        this.logInfo(`Row search has been executed for selfUrl=${selfUrl}`);
        return rows;
      })
      .catch((err) => {
        logger.error(`Unable provide a search for selfUrl=${selfUrl}`, err);
        throw err;
      });
  }

  private logInfo(message: string): void {
    if (this.secondary) {
      return;
    }

    logger.info(message);
  }
}
