import Parse from "parse/node";
import { NodeStatisticApi } from "./nodes";
import { UsageStatisticApi } from "./usage";
import { DbClient } from "../db";
import { NodesConnector } from "./connectors/nodes";
import { UsagesConnector } from "./connectors/usages";

export class StatisticApi {
  public readonly node: NodesConnector;
  public readonly usage: UsagesConnector;

  constructor(
    statUrl: string,
    appId: string,
    appKey: string,
    masterKey: string,
    cacheSize: number
  ) {
    Parse.serverURL = statUrl;
    Parse.initialize(appId, appKey, masterKey);
    this.node = new NodesConnector(new NodeStatisticApi());
    this.usage = new UsagesConnector(new UsageStatisticApi(cacheSize));
  }

  public connect(db: DbClient): this {
    this.node.connect(db.nodes);
    this.usage.connect(db.usages);
    return this;
  }
}
