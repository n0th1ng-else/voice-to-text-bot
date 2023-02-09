import pg from "pg";
import { NodesClient } from "./nodes.js";
import { UsagesClient } from "./usages.js";
import { Logger } from "../logger/index.js";
import { DonationsClient } from "./donations.js";
import { UsedEmailClient } from "./emails.js";

const { Pool } = pg;
const logger = new Logger("postgres-client");

const getPool = (config: DbConnectionConfig, threadId: number): pg.Pool => {
  return new Pool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: config.port,
    max: 1,
    application_name: `sql-stream-replica-${threadId}`,
  });
};

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

  constructor(config: DbConnectionConfig, threadId = 0, p?: pg.Pool) {
    this.initialized = Object.values(config).every((val) => val);
    if (!this.initialized) {
      logger.error(
        "Missing connection data for postgres server. Check the config",
        new Error("Missing connection data for postgres server")
      );
    }

    this.setDefaults();
    const pool = p ?? getPool(config, threadId);
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

  private setParsers(): void {
    pg.types.setTypeParser(pg.types.builtins.INT8, (val) => parseInt(val));
  }

  private setDefaults(): void {
    pg.defaults.poolSize = 1;
  }
}
