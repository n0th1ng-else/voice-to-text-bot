import { Pool } from "pg";
import { Logger } from "../logger";
import {
  DonationRowScheme,
  DonationsDb,
  DonationStatus,
} from "./sql/donations";

const logger = new Logger("postgres-donations");

export class DonationsClient {
  private readonly db: DonationsDb;

  constructor(pool: Pool) {
    this.db = new DonationsDb(pool);
  }

  public init(): Promise<void> {
    logger.info("Initializing the table");
    return this.db
      .init()
      .then(() =>
        logger.info(`Table ${Logger.y("donations")} has been initialized`)
      )
      .catch((err) => {
        logger.error(
          `Unable to initialize ${Logger.y("donations")} table`,
          err
        );
        throw err;
      });
  }

  public updateRow(
    donationId: number,
    received: boolean
  ): Promise<DonationRowScheme> {
    logger.info(`Updating the row with id=${donationId}`);
    const status = received ? DonationStatus.Received : DonationStatus.Canceled;
    return this.db
      .updateRow(donationId, status)
      .then((row) => {
        const id = this.getRowId(row);
        logger.info(
          `The row with id=${donationId} has been updated`,
          id === donationId
        );
        return row;
      })
      .catch((err) => {
        logger.error(`Unable to update the row with id=${donationId}`, err);
        throw err;
      });
  }

  public createRow(chatId: number, price: number): Promise<DonationRowScheme> {
    logger.info("Creating a new row");
    return this.db
      .createRow(chatId, price)
      .then((row) => {
        const donationId = this.getRowId(row);
        logger.info(`The row with id=${donationId} has been created`);
        return row;
      })
      .catch((err) => {
        logger.error("Unable to create a row", err);
        throw err;
      });
  }

  public getPendingRows(): Promise<DonationRowScheme[]> {
    logger.info(`Looking for rows for status=${DonationStatus.Pending}`);
    return this.db
      .getRows(DonationStatus.Pending)
      .then((rows) => {
        logger.info(
          `Row search has been executed for status=${DonationStatus.Pending}`
        );
        return rows;
      })
      .catch((err) => {
        logger.error(
          `Unable provide a search for status=${DonationStatus.Pending}`,
          err
        );
        throw err;
      });
  }

  public getRowId(row: DonationRowScheme): number {
    return this.db.getId(row);
  }
}
