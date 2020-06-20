import Parse from "parse/node";
import { LanguageCode } from "../recognition/types";
import { Logger } from "../logger";
import { UsageStatKey } from "./types";

const logger = new Logger("db");

export class UsageStatisticApi {
  private readonly dbClass = "BotStat";

  constructor(
    statUrl: string,
    appId: string,
    appKey: string,
    masterKey: string
  ) {
    Parse.serverURL = statUrl;
    Parse.initialize(appId, appKey, masterKey);
  }

  public updateUsageCount(chatId: number, username: string): Promise<void> {
    return this.getStatIfNotExists(chatId, username).then((stat) =>
      this.updateStatCount(stat, username)
    );
  }

  public updateLanguage(chatId: number, lang: LanguageCode): Promise<void> {
    return this.getStatIfNotExists(chatId).then((stat) =>
      this.updateStatLanguage(stat, lang)
    );
  }

  public getLanguage(chatId: number, username: string): Promise<LanguageCode> {
    return this.getStatIfNotExists(chatId, username).then((stat) =>
      stat.get(UsageStatKey.LangId)
    );
  }

  private getStatIfNotExists(
    chatId: number,
    username?: string
  ): Promise<Parse.Object> {
    return this.getStatId(chatId, username).then((statId) =>
      this.getStat(statId)
    );
  }

  private updateStatCount(
    instance: Parse.Object,
    username: string
  ): Promise<void> {
    logger.info(`Updating usage count for statId ${logger.y(instance.id)}`);

    const count = instance.get(UsageStatKey.UsageCount);
    instance.set(UsageStatKey.UsageCount, count + 1);
    instance.set(UsageStatKey.UserName, username);
    return instance.save().then(() => {
      // Empty promise result
    });
  }

  private updateStatLanguage(
    stat: Parse.Object,
    lang: LanguageCode
  ): Promise<void> {
    logger.info(`Updating language for statId ${logger.y(stat.id)}`);

    stat.set(UsageStatKey.LangId, lang);
    return stat.save().then(() => {
      // Empty promise result
    });
  }

  private createStat(
    chatId: number,
    lang: LanguageCode,
    username = ""
  ): Promise<string> {
    logger.info(`Creating stat record for chatId ${logger.y(chatId)}`);

    const BotStatClass = Parse.Object.extend(this.dbClass);
    const instance = new BotStatClass();
    instance.set(UsageStatKey.ChatId, chatId);
    instance.set(UsageStatKey.UsageCount, 0);
    instance.set(UsageStatKey.LangId, lang);
    instance.set(UsageStatKey.UserName, username);
    return instance.save().then((stat: Parse.Object) => stat.id);
  }

  private getStat(statId: string): Promise<Parse.Object> {
    logger.info(`Fetching stat object with statId ${logger.y(statId)}`);

    const BotStatClass = Parse.Object.extend(this.dbClass);
    const query = new Parse.Query(BotStatClass);
    return query.get(statId);
  }

  private getStatId(chatId: number, username?: string): Promise<string> {
    logger.info(`Looking for statId for chatId ${logger.y(chatId)}`);

    const BotStatClass = Parse.Object.extend(this.dbClass);
    const query = new Parse.Query(BotStatClass);
    query.equalTo(UsageStatKey.ChatId, chatId);
    // Set the first tobe the oldest one
    query.ascending(UsageStatKey.CreatedAt);
    return query.find().then((results) => {
      switch (results.length) {
        case 0: // No items in the DB
          return this.createStat(chatId, LanguageCode.En, username);
        case 1: // Single item in the DB
          return this.getFirstResultIdInArray(results);
        default:
          // Duplications in the DB
          return this.handleDuplications(chatId, results);
      }
    });
  }

  private getFirstResultIdInArray(results: Parse.Object[]): string {
    const result = results.shift();
    if (!result) {
      const err = new Error(
        "Tried to get first result in the list but it was empty"
      );
      logger.error(err.message, err);
      throw err;
    }
    return result.id;
  }

  private handleDuplications(
    chatId: number,
    results: Parse.Object[]
  ): Promise<string> {
    logger.error(`Found duplications for chatId=${chatId}`);

    // Grab the oldest row (the first one) and remove other
    const listToRemove = results.slice(1);
    const resultId = this.getFirstResultIdInArray(results);

    return Promise.all(
      listToRemove.map((res) => this.removeStat(chatId, res.id))
    ).then(() => resultId);
  }

  private removeStat(chatId: number, statId: string): Promise<void> {
    logger.warn(`Removing duplication statId=${statId} for chatId=${chatId}`);

    return this.getStat(statId)
      .then((stat) => stat.destroy())
      .then(() => {
        logger.warn(`Removed statId=${statId} for chatId=${chatId}`);
      })
      .catch((err) => {
        logger.error(
          `Failed to remove statId=${statId} for chatId=${chatId}`,
          err
        );
      });
  }
}
