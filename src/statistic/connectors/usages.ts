import { UsageStatisticApi } from "../usage";
import { UsagesClient } from "../../db/usages";
import { LanguageCode } from "../../recognition/types";
import { Logger } from "../../logger";

const logger = new Logger("usages-connector");

export class UsagesConnector {
  private db?: UsagesClient;

  constructor(private readonly stat: UsageStatisticApi) {}

  public connect(db: UsagesClient): void {
    this.db = db;
  }

  public updateUsageCount(
    chatId: number,
    username: string,
    lang: LanguageCode
  ): Promise<void> {
    return this.updateUsageCountOBJ(chatId, username, lang).then(() =>
      this.updateUsageCountDB(chatId, username, lang)
    );
  }

  public updateLanguage(chatId: number, lang: LanguageCode): Promise<void> {
    return this.updateLanguageOBJ(chatId, lang).then(() =>
      this.updateLanguageDB(chatId, lang)
    );
  }

  public getLanguage(
    chatId: number,
    username: string,
    lang: LanguageCode
  ): Promise<LanguageCode> {
    return this.getLanguageOBJ(chatId, username, lang).then(() =>
      this.getLanguageDB(chatId, username, lang)
    );
  }

  private updateUsageCountDB(
    chatId: number,
    username: string,
    lang: LanguageCode
  ): Promise<void> {
    if (!this.db) {
      return Promise.reject(new Error("Postgres in not initialized"));
    }

    return this.db.updateUsageCount(chatId, username, lang).then(() => {
      // Flatten promise
    });
  }

  private updateLanguageDB(chatId: number, lang: LanguageCode): Promise<void> {
    if (!this.db) {
      return Promise.reject(new Error("Postgres in not initialized"));
    }

    return this.db.updateLangId(chatId, lang).then(() => {
      // Flatten promise
    });
  }

  private getLanguageDB(
    chatId: number,
    username: string,
    lang: LanguageCode
  ): Promise<LanguageCode> {
    if (!this.db) {
      return Promise.reject(new Error("Postgres in not initialized"));
    }

    return this.db.getLangId(chatId, username, lang);
  }

  private updateUsageCountOBJ(
    chatId: number,
    username: string,
    lang: LanguageCode
  ): Promise<void> {
    return this.stat.updateUsageCount(chatId, username, lang).then(
      () => logger.info("STAT OK RESULT"),
      (err) => logger.error("STAT ERROR", err)
    );
  }

  private updateLanguageOBJ(chatId: number, lang: LanguageCode): Promise<void> {
    return this.stat.updateLanguage(chatId, lang).then(
      () => logger.info("STAT OK RESULT"),
      (err) => logger.error("STAT ERROR", err)
    );
  }

  private getLanguageOBJ(
    chatId: number,
    username: string,
    lang: LanguageCode
  ): Promise<void> {
    return this.stat.getLanguage(chatId, username, lang).then(
      (langId) => logger.info("STAT OK RESULT", langId),
      (err) => logger.error("STAT ERROR", err)
    );
  }
}
