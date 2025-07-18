import type { Pool } from "pg";
import type { LanguageCode } from "../recognition/types.js";
import { Logger } from "../logger/index.js";
import { type UsageRowScheme, UsagesDb } from "./sql/usages.js";
import { getLanguageByText } from "../telegram/helpers.js";
import type { ChatId } from "../telegram/api/core.js";
import type { UsageId } from "./sql/types.js";

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
    chatId: ChatId,
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
    chatId: ChatId,
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
    chatId: ChatId,
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
  public async importRow(
    chatId: ChatId,
    usageCount: number,
    langId: string,
    username: string,
    createdAt: Date,
    updatedAt: Date,
  ): Promise<UsageRowScheme> {
    const rows = await this.getRows(chatId);
    const existingRow = rows.shift();
    const row =
      existingRow ??
      (await this.db.createRow(chatId, langId, username, usageCount));
    return await this.db.updateRowWithDate(
      row.usage_id,
      langId,
      usageCount,
      username,
      createdAt,
      updatedAt,
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
    usageId: UsageId,
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
    chatId: ChatId,
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

  private getRows(chatId: ChatId): Promise<UsageRowScheme[]> {
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
