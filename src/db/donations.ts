import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import {
  type DonationRowScheme,
  DonationsDb,
  DonationStatus,
  type DonationStatusType,
} from "./sql/donations.js";
import type { ChatId } from "../telegram/api/core.js";

const logger = new Logger("postgres-donations");

export class DonationsClient {
  private readonly db: DonationsDb;
  private secondary = false;

  constructor(pool: Pool) {
    this.db = new DonationsDb(pool);
  }

  public init(): Promise<void> {
    this.logInfo("Initializing the table");
    return this.db
      .init()
      .then(() =>
        this.logInfo(`Table ${Logger.y("donations")} has been initialized`),
      )
      .catch((err) => {
        logger.error(
          `Unable to initialize ${Logger.y("donations")} table`,
          err,
        );
        throw err;
      });
  }

  public setSecondary(): void {
    this.secondary = true;
  }

  public updateRow(
    donationId: number,
    status: DonationStatusType,
  ): Promise<DonationRowScheme> {
    this.logInfo(`Updating the row with id=${donationId}`);
    return this.db
      .updateRow(donationId, status)
      .then((row) => {
        const id = this.getRowId(row);
        this.logInfo(
          `The row with id=${donationId} has been updated ${id === donationId}`,
        );
        return row;
      })
      .catch((err) => {
        logger.error(`Unable to update the row with id=${donationId}`, err);
        throw err;
      });
  }

  public createRow(chatId: ChatId, price: number): Promise<DonationRowScheme> {
    this.logInfo("Creating a new row");
    return this.db
      .createRow(chatId, price)
      .then((row) => {
        const donationId = this.getRowId(row);
        this.logInfo(`The row with id=${donationId} has been created`);
        return row;
      })
      .catch((err) => {
        logger.error("Unable to create a row", err);
        throw err;
      });
  }

  public getPendingRows(): Promise<DonationRowScheme[]> {
    this.logInfo(`Looking for rows for status=${DonationStatus.Pending}`);
    return this.db
      .getRows(DonationStatus.Pending)
      .then((rows) => {
        this.logInfo(
          `Row search has been executed for status=${DonationStatus.Pending}`,
        );
        return rows;
      })
      .catch((err) => {
        logger.error(
          `Unable provide a search for status=${DonationStatus.Pending}`,
          err,
        );
        throw err;
      });
  }

  public getRowId(row: DonationRowScheme): number {
    return this.db.getId(row);
  }

  private logInfo(message: string): void {
    if (this.secondary) {
      return;
    }

    logger.info(message);
  }
}
