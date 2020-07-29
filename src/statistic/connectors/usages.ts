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
    return this.updateUsageCountDB(chatId, username, lang).then(() =>
      this.stat.updateUsageCount(chatId, username, lang)
    );
  }

  public updateLanguage(chatId: number, lang: LanguageCode): Promise<void> {
    return this.updateLanguageDB(chatId, lang).then(() =>
      this.stat.updateLanguage(chatId, lang)
    );
  }

  public getLanguage(
    chatId: number,
    username: string,
    lang: LanguageCode
  ): Promise<LanguageCode> {
    return this.getLanguageDB(chatId, username, lang).then(() =>
      this.stat.getLanguage(chatId, username, lang)
    );
  }

  public updateUsageCountDB(
    chatId: number,
    username: string,
    lang: LanguageCode
  ): Promise<void> {
    if (!this.db) {
      return Promise.resolve();
    }

    return this.db.updateUsageCount(chatId, username, lang).then(
      () => logger.info("POSTGRES OK RESULT"),
      (err) => logger.error("POSTGRES ERROR", err)
    );
  }

  public updateLanguageDB(chatId: number, lang: LanguageCode): Promise<void> {
    if (!this.db) {
      return Promise.resolve();
    }

    return this.db.updateLangId(chatId, lang).then(
      () => logger.info("POSTGRES OK RESULT"),
      (err) => logger.error("POSTGRES ERROR", err)
    );
  }

  public getLanguageDB(
    chatId: number,
    username: string,
    lang: LanguageCode
  ): Promise<void> {
    if (!this.db) {
      return Promise.resolve();
    }

    return this.db.getLangId(chatId, username, lang).then(
      (langId) => logger.info("POSTGRES OK RESULT", langId),
      (err) => logger.error("POSTGRES ERROR", err)
    );
  }
}
