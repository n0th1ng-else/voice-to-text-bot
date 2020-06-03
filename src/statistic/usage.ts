import Parse from "parse/node";
import { LanguageCode } from "../recognition/types";
import { Logger } from "../logger";

const logger = new Logger("db");

enum StatKey {
  UsageCount = "usageCount",
  LangId = "langId",
  ChatId = "chatId",
  UserName = "user",
}

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
    return this.getStatId(chatId)
      .catch(() => this.createStat(chatId, LanguageCode.Ru, username))
      .then((statId) => this.getStat(statId))
      .then((stat) => this.updateStatCount(stat, username));
  }

  public updateLanguage(chatId: number, lang: LanguageCode): Promise<void> {
    return this.getStatId(chatId)
      .catch(() => this.createStat(chatId, lang))
      .then((statId) => this.getStat(statId))
      .then((stat) => this.updateStatLanguage(stat, lang));
  }

  public getLanguage(chatId: number, username: string): Promise<LanguageCode> {
    return this.getStatId(chatId)
      .catch(() => this.createStat(chatId, LanguageCode.Ru, username))
      .then((statId) => this.getStat(statId))
      .then((stat) => stat.get(StatKey.LangId));
  }

  private updateStatCount(
    instance: Parse.Object,
    username: string
  ): Promise<void> {
    logger.info(`Updating usage count for statId ${logger.y(instance.id)}`);

    const count = instance.get(StatKey.UsageCount);
    instance.set(StatKey.UsageCount, count + 1);
    instance.set(StatKey.UserName, username);
    return instance.save().then(() => {
      // Empty promise result
    });
  }

  private updateStatLanguage(
    stat: Parse.Object,
    lang: LanguageCode
  ): Promise<void> {
    logger.info(`Updating language for statId ${logger.y(stat.id)}`);

    stat.set(StatKey.LangId, lang);
    return stat.save().then(() => {
      // Empty promise result
    });
  }

  public createStat(
    chatId: number,
    lang: LanguageCode,
    username = ""
  ): Promise<string> {
    logger.info(`Creating stat record for chatId ${logger.y(chatId)}`);

    const BotStatClass = Parse.Object.extend(this.dbClass);
    const instance = new BotStatClass();
    instance.set(StatKey.ChatId, chatId);
    instance.set(StatKey.UsageCount, 0);
    instance.set(StatKey.LangId, lang);
    instance.set(StatKey.UserName, username);
    return instance.save().then((stat: Parse.Object) => stat.id);
  }

  private getStat(statId: string) {
    logger.info(`Fetching stat object with statId ${logger.y(statId)}`);

    const BotStatClass = Parse.Object.extend(this.dbClass);
    const query = new Parse.Query(BotStatClass);
    return query.get(statId);
  }

  private getStatId(chatId: number): Promise<string> {
    logger.info(`Looking for statId for chatId ${logger.y(chatId)}`);

    const BotStatClass = Parse.Object.extend(this.dbClass);
    const query = new Parse.Query(BotStatClass);
    query.equalTo(StatKey.ChatId, chatId);
    return query.find().then((results) => {
      if (!results.length) {
        return Promise.reject(new Error(`Record ${chatId} not found`));
      }

      const result = results[0];
      return result.id;
    });
  }
}
