import Parse from "parse/node";
import { LanguageCode } from "../recognition/types";
import { Logger } from "../logger";

const logger = new Logger("db");

enum StatKey {
  UsageCount = "usageCount",
  LangId = "langId",
  ChatId = "chatId",
}

export class StatisticApi {
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

  public updateUsageCount(chatId: number) {
    return this.getStatId(chatId)
      .catch(() => this.createStat(chatId))
      .then((statId) => this.getStat(statId))
      .then((stat) => this.updateStatCount(stat));
  }

  public updateLanguage(chatId: number, lang: LanguageCode) {
    return this.getStatId(chatId)
      .catch(() => this.createStat(chatId, lang))
      .then((statId) => this.getStat(statId))
      .then((stat) => this.updateStatLanguage(stat, lang));
  }

  private updateStatCount(stat: Parse.Object): Promise<void> {
    logger.info("Updating usage count for statId", stat.id);

    const count = stat.get(StatKey.UsageCount);
    stat.set(StatKey.UsageCount, count + 1);
    return stat.save().then(() => {
      // Empty promise result
    });
  }

  private updateStatLanguage(
    stat: Parse.Object,
    lang: LanguageCode
  ): Promise<void> {
    logger.info("Updating language for statId", stat.id);

    stat.set(StatKey.LangId, lang);
    return stat.save().then(() => {
      // Empty promise result
    });
  }

  public createStat(chatId: number, lang = LanguageCode.Ru): Promise<string> {
    logger.info("Creating stat record for chatId", chatId);

    const BotStatClass = Parse.Object.extend(this.dbClass);
    const instance = new BotStatClass();
    instance.set(StatKey.ChatId, chatId);
    instance.set(StatKey.UsageCount, 0);
    instance.set(StatKey.LangId, lang);
    return instance.save().then((stat: Parse.Object) => stat.id);
  }

  private getStat(statId: string) {
    logger.info("Fetching stat object with statId", statId);

    const BotStatClass = Parse.Object.extend(this.dbClass);
    const query = new Parse.Query(BotStatClass);
    return query.get(statId);
  }

  private getStatId(chatId: number): Promise<string> {
    logger.info("Looking for statId for chatId", chatId);

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
