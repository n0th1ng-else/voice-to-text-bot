import Parse from "parse/node";
import { Logger } from "../logger";

const logger = new Logger("db");

enum StatKey {
  Active = "active",
  SelfUrl = "selfUrl",
}

export class NodeStatisticApi {
  private readonly dbClass = "NodeStat";

  constructor(
    statUrl: string,
    appId: string,
    appKey: string,
    masterKey: string
  ) {
    Parse.serverURL = statUrl;
    Parse.initialize(appId, appKey, masterKey);
  }

  public toggleActive(selfUrl: string, active: boolean) {
    return this.getStatId(selfUrl)
      .catch(() => this.createStat(selfUrl, active))
      .then((statId) => this.getStat(statId))
      .then((stat) => this.toggleNodeActive(stat, active));
  }

  private toggleNodeActive(stat: Parse.Object, active: boolean): Promise<void> {
    logger.info("Updating language for statId", stat.id);

    stat.set(StatKey.Active, active);
    return stat.save().then(() => {
      // Empty promise result
    });
  }

  public createStat(selfUrl: string, active: boolean): Promise<string> {
    logger.info("Creating stat record for url", selfUrl);

    const NodeStatClass = Parse.Object.extend(this.dbClass);
    const instance = new NodeStatClass();
    instance.set(StatKey.SelfUrl, selfUrl);
    instance.set(StatKey.Active, active);
    return instance.save().then((stat: Parse.Object) => stat.id);
  }

  private getStat(statId: string) {
    logger.info("Fetching node stat object with statId", statId);

    const NodeStatClass = Parse.Object.extend(this.dbClass);
    const query = new Parse.Query(NodeStatClass);
    return query.get(statId);
  }

  private getStatId(selfUrl: string): Promise<string> {
    logger.info("Looking for statId for url", selfUrl);

    const NodeStatClass = Parse.Object.extend(this.dbClass);
    const query = new Parse.Query(NodeStatClass);
    query.equalTo(StatKey.SelfUrl, selfUrl);
    return query.find().then((results) => {
      if (!results.length) {
        return Promise.reject(new Error(`Record ${selfUrl} not found`));
      }

      const result = results[0];
      return result.id;
    });
  }
}
