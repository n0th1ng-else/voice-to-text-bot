import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import { type DurationRowScheme, DurationsDb } from "./sql/durations.js";
import type { ChatId } from "../telegram/api/core.js";

const logger = new Logger("postgres-durations");

export class DurationsClient {
  private readonly db: DurationsDb;
  private secondary = false;

  constructor(pool: Pool) {
    this.db = new DurationsDb(pool);
  }

  public init(): Promise<void> {
    this.logInfo("Initializing the table");
    return this.db
      .init()
      .then(() =>
        this.logInfo(`Table ${Logger.y("durations")} has been initialized`),
      )
      .catch((err) => {
        logger.error(
          `Unable to initialize ${Logger.y("durations")} table`,
          err,
        );
        throw err;
      });
  }

  public setSecondary(): void {
    this.secondary = true;
  }

  public createRow(
    chatId: ChatId,
    duration: number,
  ): Promise<DurationRowScheme> {
    this.logInfo("Creating a new row");
    return this.db
      .createRow(chatId, duration)
      .then((row) => {
        const durationId = this.db.getId(row);
        this.logInfo(`The row with id=${durationId} has been created`);
        return row;
      })
      .catch((err) => {
        logger.error("Unable to create a row", err);
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
