import { NodeStatisticApi } from "../nodes";
import { NodesClient } from "../../db/nodes";
import { Logger } from "../../logger";

const logger = new Logger("nodes-connector");

export class NodesConnector {
  private db?: NodesClient;

  constructor(private readonly stat: NodeStatisticApi) {}

  public connect(db: NodesClient): void {
    this.db = db;
  }

  public toggleActive(
    selfUrl: string,
    active: boolean,
    version: string
  ): Promise<void> {
    return this.toggleActiveDB(selfUrl, active, version).then(() =>
      this.stat.toggleActive(selfUrl, active, version)
    );
  }

  public toggleActiveDB(
    selfUrl: string,
    active: boolean,
    version: string
  ): Promise<void> {
    if (!this.db) {
      return Promise.resolve();
    }

    return this.db.updateState(selfUrl, active, version).then(
      () => logger.info("POSTGRES OK RESULT"),
      (err) => logger.error("POSTGRES ERROR", err)
    );
  }
}