import Parse from "parse/node";
import { Logger } from "../logger";

const logger = new Logger("db");

enum StatKey {
  Active = "active",
  SelfUrl = "selfUrl",
  Version = "version",
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

  public toggleActive(
    selfUrl: string,
    active: boolean,
    version: string
  ): Promise<void> {
    return this.getStatId(selfUrl)
      .catch(() => this.createStat(selfUrl, active, version))
      .then((statId) => this.getStat(statId))
      .then((stat) => this.toggleNodeActive(stat, active, version));
  }

  private toggleNodeActive(
    instance: Parse.Object,
    active: boolean,
    version: string
  ): Promise<void> {
    logger.info(`Updating active state for ${logger.y(instance.id)}`);

    instance.set(StatKey.Active, active);
    instance.set(StatKey.Version, version);
    return instance.save().then(() => {
      // Empty promise result
    });
  }

  public createStat(
    selfUrl: string,
    active: boolean,
    version: string
  ): Promise<string> {
    logger.info(`Creating stat record for url ${logger.y(selfUrl)}`);

    const NodeStatClass = Parse.Object.extend(this.dbClass);
    const instance = new NodeStatClass();
    instance.set(StatKey.SelfUrl, selfUrl);
    instance.set(StatKey.Active, active);
    instance.set(StatKey.Version, version);
    return instance.save().then((stat: Parse.Object) => stat.id);
  }

  private getStat(statId: string) {
    logger.info(`Fetching node stat object with statId ${logger.y(statId)}`);

    const NodeStatClass = Parse.Object.extend(this.dbClass);
    const query = new Parse.Query(NodeStatClass);
    return query.get(statId);
  }

  private getStatId(selfUrl: string): Promise<string> {
    logger.info(`Looking for statId for url ${logger.y(selfUrl)}`);

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
