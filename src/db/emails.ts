import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import { UsedEmailDb, type UsedEmailRowScheme } from "./sql/emails.js";
import type { EmailId } from "./sql/types.js";

const logger = new Logger("postgres-emails");

export class UsedEmailClient {
  private readonly db: UsedEmailDb;
  private secondary = false;

  constructor(pool: Pool) {
    this.db = new UsedEmailDb(pool);
  }

  public init(): Promise<void> {
    this.logInfo("Initializing the table");
    return this.db
      .init()
      .then(() => this.logInfo(`Table ${Logger.y("usedemails")} has been initialized`))
      .catch((err) => {
        logger.error(`Unable to initialize ${Logger.y("usedemails")} table`, err);
        throw err;
      });
  }

  public setSecondary(): void {
    this.secondary = true;
  }

  public updateRow(emailId: EmailId): Promise<UsedEmailRowScheme> {
    this.logInfo(`Updating the row with id=${emailId}`);

    return this.db
      .updateRow(emailId)
      .then((row) => {
        const id = this.getRowId(row);
        this.logInfo(`The row with id=${emailId} has been updated ${id === emailId}`);
        return row;
      })
      .catch((err) => {
        logger.error(`Unable to update the row with id=${emailId}`, err);
        throw err;
      });
  }

  public createRow(email: string): Promise<UsedEmailRowScheme> {
    this.logInfo("Creating a new row");
    return this.db
      .createRow(email)
      .then((row) => {
        const emailId = this.getRowId(row);
        this.logInfo(`The row with id=${emailId} has been created`);
        return row;
      })
      .catch((err) => {
        logger.error("Unable to create a row", err);
        throw err;
      });
  }

  public getRows(email: string): Promise<UsedEmailRowScheme[]> {
    this.logInfo(`Looking for rows for email=${email}`);
    return this.db
      .getRows(email)
      .then((rows) => {
        this.logInfo(`Row search has been executed for email=${email}`);
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

  private logInfo(message: string): void {
    if (this.secondary) {
      return;
    }

    logger.info(message);
  }
}
