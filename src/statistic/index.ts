import Parse from "parse/node";
import { NodeStatisticApi } from "./nodes";
import { UsageStatisticApi } from "./usage";

export class StatisticApi {
  public readonly node: NodeStatisticApi;
  public readonly usage: UsageStatisticApi;

  constructor(
    statUrl: string,
    appId: string,
    appKey: string,
    masterKey: string,
    cacheSize: number
  ) {
    Parse.serverURL = statUrl;
    Parse.initialize(appId, appKey, masterKey);
    this.node = new NodeStatisticApi();
    this.usage = new UsageStatisticApi(cacheSize);
  }
}
