import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import { DurationRowScheme, DurationsDb } from "./sql/durations.js";

const logger = new Logger("postgres-durations");

export class DurationsClient {
  private readonly db: DurationsDb;

  constructor(pool: Pool) {
    this.db = new DurationsDb(pool);
  }

  public init(): Promise<void> {
    logger.info("Initializing the table");
    return this.db
      .init()
      .then(() =>
        logger.info(`Table ${Logger.y("durations")} has been initialized`),
      )
      .catch((err) => {
        logger.error(
          `Unable to initialize ${Logger.y("durations")} table`,
          err,
        );
        throw err;
      });
  }

  private createRow(
    chatId: number,
    duration: number,
  ): Promise<DurationRowScheme> {
    logger.info("Creating a new row");
    return this.db
      .createRow(chatId, duration)
      .then((row) => {
        const durationId = this.db.getId(row);
        logger.info(`The row with id=${durationId} has been created`);
        return row;
      })
      .catch((err) => {
        logger.error("Unable to create a row", err);
        throw err;
      });
  }
}
