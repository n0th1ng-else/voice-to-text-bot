import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import { UsedEmailDb, UsedEmailRowScheme } from "./sql/emails.js";

const logger = new Logger("postgres-emails");

export class UsedEmailClient {
  private readonly db: UsedEmailDb;

  constructor(pool: Pool) {
    this.db = new UsedEmailDb(pool);
  }

  public init(): Promise<void> {
    logger.info("Initializing the table");
    return this.db
      .init()
      .then(() =>
        logger.info(`Table ${Logger.y("usedemails")} has been initialized`)
      )
      .catch((err) => {
        logger.error(
          `Unable to initialize ${Logger.y("usedemails")} table`,
          err
        );
        throw err;
      });
  }

  public updateRow(emailId: number): Promise<UsedEmailRowScheme> {
    logger.info(`Updating the row with id=${emailId}`);

    return this.db
      .updateRow(emailId)
      .then((row) => {
        const id = this.getRowId(row);
        logger.info(
          `The row with id=${emailId} has been updated`,
          id === emailId
        );
        return row;
      })
      .catch((err) => {
        logger.error(`Unable to update the row with id=${emailId}`, err);
        throw err;
      });
  }

  public createRow(email: string): Promise<UsedEmailRowScheme> {
    logger.info("Creating a new row");
    return this.db
      .createRow(email)
      .then((row) => {
        const emailId = this.getRowId(row);
        logger.info(`The row with id=${emailId} has been created`);
        return row;
      })
      .catch((err) => {
        logger.error("Unable to create a row", err);
        throw err;
      });
  }

  public getRows(email: string): Promise<UsedEmailRowScheme[]> {
    logger.info(`Looking for rows for email=${email}`);
    return this.db
      .getRows(email)
      .then((rows) => {
        logger.info(`Row search has been executed for email=${email}`);
        return rows;
      })
      .catch((err) => {
        logger.error(`Unable provide a search for email=${email}`, err);
        throw err;
      });
  }

  public getRowId(row: UsedEmailRowScheme): number {
    return this.db.getId(row);
  }
}
