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
    return this.toggleActiveOBJ(selfUrl, active, version).then(() =>
      this.toggleActiveDB(selfUrl, active, version)
    );
  }

  private toggleActiveDB(
    selfUrl: string,
    active: boolean,
    version: string
  ): Promise<void> {
    if (!this.db) {
      return Promise.reject(new Error("Postgres in not initialized"));
    }

    return this.db.updateState(selfUrl, active, version).then(() => {
      // Flatten promise
    });
  }

  private toggleActiveOBJ(
    selfUrl: string,
    active: boolean,
    version: string
  ): Promise<void> {
    return this.stat.toggleActive(selfUrl, active, version).then(
      () => logger.info("STAT OK RESULT"),
      (err) => logger.error("STAT ERROR", err)
    );
  }
}
