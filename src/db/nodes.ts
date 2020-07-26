import { Pool } from "pg";
import { Logger } from "../logger";
import { NodeRowScheme, NodesDb } from "./sql/nodes";

const logger = new Logger("postgres-nodes");

export class NodesClient {
  private readonly db: NodesDb;

  constructor(pool: Pool) {
    this.db = new NodesDb(pool);
  }

  public init(): Promise<void> {
    logger.info("Initializing the table");
    return this.db
      .init()
      .then(() =>
        logger.info(`Table ${Logger.y("nodes")} has been initialized`)
      )
      .catch((err) => {
        logger.error(`Unable to initialize ${Logger.y("nodes")} table`);
        throw err;
      });
  }

  public updateState(
    selfUrl: string,
    isActive: boolean,
    version: string
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
    nodeId: string,
    isActive: boolean,
    version: string
  ): Promise<NodeRowScheme> {
    logger.info(`Updating the row with id=${nodeId}`);
    return this.db
      .updateRow(nodeId, isActive, version)
      .then((row) => {
        const id = this.db.getId(row);
        logger.info(
          `The row with id=${nodeId} has been updated`,
          id === nodeId
        );
        return row;
      })
      .catch((err) => {
        logger.error(`Unable to update the row with id=${nodeId}`);
        throw err;
      });
  }

  private createRow(
    selfUrl: string,
    isActive: boolean,
    version: string
  ): Promise<NodeRowScheme> {
    logger.info("Creating a new row");
    return this.db
      .createRow(selfUrl, isActive, version)
      .then((row) => {
        const nodeId = this.db.getId(row);
        logger.info(`The row with id=${nodeId} has been created`);
        return row;
      })
      .catch((err) => {
        logger.error("Unable to create a row");
        throw err;
      });
  }

  private getRows(selfUrl: string): Promise<NodeRowScheme[]> {
    logger.info(`Looking for rows for selfUrl=${selfUrl}`);
    return this.db
      .getRows(selfUrl)
      .then((rows) => {
        logger.info(`Row search has been executed for selfUrl=${selfUrl}`);
        return rows;
      })
      .catch((err) => {
        logger.error(`Unable provide a search for selfUrl=${selfUrl}`);
        throw err;
      });
  }
}
