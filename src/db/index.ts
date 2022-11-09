import { Pool, types as PGTypes, defaults as PGDefaults } from "pg";
import { NodesClient } from "./nodes";
import { UsagesClient } from "./usages";
import { Logger } from "../logger";
import { DonationsClient } from "./donations";
import { UsedEmailClient } from "./emails";

const logger = new Logger("postgres-client");

interface DbConnectionConfig {
  user: string;
  password: string;
  host: string;
  database: string;
  port: number;
}

export class DbClient {
  public readonly nodes: NodesClient;
  public readonly usages: UsagesClient;
  public readonly donations: DonationsClient;
  public readonly emails: UsedEmailClient;

  private readonly initialized: boolean;
  private ready = false;

  private static getPool(config: DbConnectionConfig): Pool {
    return new Pool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port,
      max: 1,
    });
  }

  constructor(config: DbConnectionConfig, pool = DbClient.getPool(config)) {
    this.initialized = Object.values(config).every((val) => val);
    if (!this.initialized) {
      logger.error(
        "Missing connection data for postgres server. Check the config",
        new Error("Missing connection data for postgres server")
      );
    }

    this.setDefaults();
    this.setParsers();

    this.nodes = new NodesClient(pool);
    this.usages = new UsagesClient(pool);
    this.donations = new DonationsClient(pool);
    this.emails = new UsedEmailClient(pool);
  }

  public init(): Promise<void> {
    if (!this.initialized) {
      return Promise.resolve();
    }

    return Promise.all([
      this.usages.init(),
      this.nodes.init(),
      this.donations.init(),
      this.emails.init(),
    ]).then(() => {
      this.ready = true;
    });
  }

  public isReady(): boolean {
    return this.ready;
  }

  public setClientName(threadId: number): this {
    PGDefaults.application_name = `bot sql stream for replica ${threadId}`;
    return this;
  }

  private setParsers(): void {
    PGTypes.setTypeParser(PGTypes.builtins.INT8, (val) => parseInt(val));
  }

  private setDefaults(): void {
    PGDefaults.poolSize = 1;
  }
}
