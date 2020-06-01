import { NodeStatisticApi } from "./nodes";
import { UsageStatisticApi } from "./usage";

export class StatisticApi {
  public readonly node: NodeStatisticApi;
  public readonly usage: UsageStatisticApi;

  constructor(
    statUrl: string,
    appId: string,
    appKey: string,
    masterKey: string
  ) {
    this.node = new NodeStatisticApi(statUrl, appId, appKey, masterKey);
    this.usage = new UsageStatisticApi(statUrl, appId, appKey, masterKey);
  }
}
