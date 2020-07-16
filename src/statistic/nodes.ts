import Parse from "parse/node";
import { Logger } from "../logger";
import { NodeStatKey } from "./types";

const logger = new Logger("db");

export class NodeStatisticApi {
  public static readonly dbClass = "NodeStat";

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
    logger.info(`Updating active state for ${Logger.y(instance.id)}`);

    instance.set(NodeStatKey.Active, active);
    instance.set(NodeStatKey.Version, version);
    return instance.save().then(() => {
      // Empty promise result
    });
  }

  public createStat(
    selfUrl: string,
    active: boolean,
    version: string
  ): Promise<string> {
    logger.info(`Creating stat record for url ${Logger.y(selfUrl)}`);

    const NodeStatClass = Parse.Object.extend(NodeStatisticApi.dbClass);
    const instance = new NodeStatClass();
    instance.set(NodeStatKey.SelfUrl, selfUrl);
    instance.set(NodeStatKey.Active, active);
    instance.set(NodeStatKey.Version, version);
    return instance.save().then((stat: Parse.Object) => stat.id);
  }

  private getStat(statId: string) {
    logger.info(`Fetching node stat object with statId ${Logger.y(statId)}`);

    const NodeStatClass = Parse.Object.extend(NodeStatisticApi.dbClass);
    const query = new Parse.Query(NodeStatClass);
    return query.get(statId);
  }

  private getStatId(selfUrl: string): Promise<string> {
    logger.info(`Looking for statId for url ${Logger.y(selfUrl)}`);

    const NodeStatClass = Parse.Object.extend(NodeStatisticApi.dbClass);
    const query = new Parse.Query(NodeStatClass);
    query.equalTo(NodeStatKey.SelfUrl, selfUrl);

    return query.find().then((results) => {
      if (!results.length) {
        return Promise.reject(new Error(`Record ${selfUrl} not found`));
      }

      const result = results[0];
      return result.id;
    });
  }
}
