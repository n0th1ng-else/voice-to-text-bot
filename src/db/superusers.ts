import { Pool } from "pg";
import { Logger } from "../logger";
import { SuperusersDb } from "./sql/superusers";
import { getMd5Hash } from "../common/hash";

const logger = new Logger("postgres-superuser");

export class SuperusersClient {
  private readonly db: SuperusersDb;

  constructor(pool: Pool) {
    this.db = new SuperusersDb(pool);
  }

  public init(): Promise<void> {
    logger.info("Initializing the table");
    return this.db
      .init()
      .then(() =>
        logger.info(`Table ${Logger.y("superusers")} has been initialized`)
      )
      .catch((err) => {
        logger.error(`Unable to initialize ${Logger.y("superusers")} table`);
        throw err;
      });
  }

  public isSuperuser(chatId: number, hash: string): Promise<boolean> {
    logger.info(`Checking if user=${chatId} has super power`);

    return this.db
      .getRows()
      .then((rows) => {
        const row = rows.find(
          (tableRow) =>
            hash ===
            getMd5Hash(
              tableRow.chat_id,
              tableRow.token,
              tableRow.created_at.getTime()
            )
        );
        logger.info(
          `Successfully checked permissions for user=${chatId}, hasPermissions=${!!row}`
        );
        return !!row;
      })
      .catch((err) => {
        logger.error(`Unable to check permissions for user=${chatId}`);
        throw err;
      });
  }
}
