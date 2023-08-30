import type { Pool } from "pg";
import { Logger } from "../logger/index.js";
import { IgnoredChatsDb, IgnoredChatRowScheme } from "./sql/ignoredchats.js";

const logger = new Logger("postgres-ignored-chats");

export class IgnoredChatsClient {
  private readonly db: IgnoredChatsDb;

  constructor(pool: Pool) {
    this.db = new IgnoredChatsDb(pool);
  }

  public init(): Promise<void> {
    logger.info("Initializing the table");
    return this.db
      .init()
      .then(() =>
        logger.info(`Table ${Logger.y("ignoredchats")} has been initialized`),
      )
      .catch((err) => {
        logger.error(
          `Unable to initialize ${Logger.y("ignoredchats")} table`,
          err,
        );
        throw err;
      });
  }

  getRow(chatId: number): Promise<IgnoredChatRowScheme | null> {
    logger.info(`Looking for row for chatId=${chatId}`);
    return this.db
      .getRow(chatId)
      .then((row) => {
        logger.info(`Row search has been executed for chatId=${chatId}`);
        return row;
      })
      .catch((err) => {
        logger.error(`Unable provide a search for chatId=${chatId}`, err);
        throw err;
      });
  }
}
