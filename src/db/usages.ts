import type { Pool } from "pg";
import type { LanguageCode } from "../recognition/types.ts";
import { Logger } from "../logger/index.ts";
import { type UsageRowScheme, UsagesDb } from "./sql/usages.ts";
import { getLanguageByText } from "../telegram/helpers.ts";

const logger = new Logger("postgres-usages");

export class UsagesClient {
  private readonly db: UsagesDb;
  private secondary = false;

  constructor(pool: Pool) {
    this.db = new UsagesDb(pool);
  }

  public init(): Promise<void> {
    this.logInfo("Initializing the table");
    return this.db
      .init()
      .then(() =>
        this.logInfo(`Table ${Logger.y("usages")} has been initialized`),
      )
      .catch((err) => {
        logger.error(`Unable to initialize ${Logger.y("usages")} table`, err);
        throw err;
      });
  }

  public setSecondary(): void {
    this.secondary = true;
  }

  public getLangId(
    chatId: number,
    username: string,
    langId: LanguageCode,
  ): Promise<LanguageCode> {
    return this.getRows(chatId)
      .then((rows) => {
        const row = rows.shift();
        if (row) {
          return row;
        }

        return this.createRow(chatId, langId, username);
      })
      .then((row) => getLanguageByText(row.lang_id));
  }

  public updateLangId(
    chatId: number,
    langId: LanguageCode,
  ): Promise<UsageRowScheme> {
    return this.getRows(chatId).then((rows) => {
      const row = rows.shift();
      if (row) {
        return this.updateRow(
          row.usage_id,
          langId,
          row.usage_count,
          row.user_name,
        );
      }

      return this.createRow(chatId, langId);
    });
  }

  public updateUsageCount(
    chatId: number,
    username: string,
    langId: LanguageCode,
  ): Promise<UsageRowScheme> {
    return this.getRows(chatId).then((rows) => {
      const row = rows.shift();
      if (row) {
        return this.updateRow(
          row.usage_id,
          row.lang_id || langId,
          row.usage_count + 1,
          username || row.user_name,
        );
      }

      return this.createRow(chatId, langId, username, 1);
    });
  }

  /**
   * @deprecated Use it only for migration
   */
  public importRow(
    chatId: number,
    usageCount: number,
    langId: string,
    username: string,
    createdAt: Date,
    updatedAt: Date,
  ): Promise<UsageRowScheme> {
    return this.getRows(chatId)
      .then((rows) => {
        const row = rows.shift();
        return row
          ? row
          : this.db.createRow(chatId, langId, username, usageCount);
      })
      .then((row) =>
        this.db.updateRowWithDate(
          row.usage_id,
          langId,
          usageCount,
          username,
          createdAt,
          updatedAt,
        ),
      );
  }

  /**
   * @deprecated Use it only for chart
   */
  public statRows(
    from: Date,
    to: Date,
    usageCountFrom: number,
  ): Promise<UsageRowScheme[]> {
    this.logInfo("Looking for rows");
    return this.db
      .statRows(from, to, usageCountFrom)
      .then((rows) => {
        this.logInfo("Row search has been executed");
        return rows;
      })
      .catch((err) => {
        logger.error("Unable provide a search", err);
        throw err;
      });
  }

  private updateRow(
    usageId: string,
    langId: string,
    usageCount: number,
    username: string,
  ): Promise<UsageRowScheme> {
    this.logInfo(`Updating the row with id=${usageId}`);
    return this.db
      .updateRow(usageId, langId, usageCount, username)
      .then((row) => {
        const id = this.db.getId(row);
        this.logInfo(
          `The row with id=${usageId} has been updated ${id === usageId}`,
        );
        return row;
      })
      .catch((err) => {
        logger.error(`Unable to update the row with id=${usageId}`, err);
        throw err;
      });
  }

  private createRow(
    chatId: number,
    langId: LanguageCode,
    username = "",
    usageCount = 0,
  ): Promise<UsageRowScheme> {
    this.logInfo("Creating a new row");
    return this.db
      .createRow(chatId, langId, username, usageCount)
      .then((row) => {
        const usageId = this.db.getId(row);
        this.logInfo(`The row with id=${usageId} has been created`);
        return row;
      })
      .catch((err) => {
        logger.error("Unable to create a row", err);
        throw err;
      });
  }

  private getRows(chatId: number): Promise<UsageRowScheme[]> {
    this.logInfo(`Looking for rows for chatId=${chatId}`);
    return this.db
      .getRows(chatId)
      .then((rows) => {
        this.logInfo(`Row search has been executed for chatId=${chatId}`);
        return rows;
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
