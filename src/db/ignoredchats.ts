import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import {
  IgnoredChatsDb,
  type IgnoredChatsRowScheme,
} from "./sql/ignoredchats.js";

const logger = new Logger("postgres-ignored-chats");

export class IgnoredChatsClient {
  private readonly db: IgnoredChatsDb;
  private secondary = false;

  constructor(pool: Pool) {
    this.db = new IgnoredChatsDb(pool);
  }

  public init(): Promise<void> {
    this.logInfo("Initializing the table");
    return this.db
      .init()
      .then(() =>
        this.logInfo(`Table ${Logger.y("ignoredchats")} has been initialized`),
      )
      .catch((err) => {
        logger.error(
          `Unable to initialize ${Logger.y("ignoredchats")} table`,
          err,
        );
        throw err;
      });
  }

  public setSecondary(): void {
    this.secondary = true;
  }

  public getRow(chatId: number): Promise<IgnoredChatsRowScheme | null> {
    this.logInfo(`Looking for row for chatId=${chatId}`);
    return this.db
      .getRow(chatId)
      .then((row) => {
        this.logInfo(`Row search has been executed for chatId=${chatId}`);
        return row;
      })
      .catch((err) => {
        logger.error(`Unable provide a search for chatId=${chatId}`, err);
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
