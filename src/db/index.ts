import { Pool, types as PGTypes, defaults as PGDefaults } from "pg";
import { NodesClient } from "./nodes";
import { UsagesClient } from "./usages";
import { Logger } from "../logger";

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

  private readonly initialized: boolean;

  constructor(config: DbConnectionConfig) {
    this.initialized = Object.values(config).every((val) => val);
    if (!this.initialized) {
      logger.error(
        "Missing connection data for postgres server. Check the config"
      );
    }
    const pool = new Pool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port,
      max: 1,
    });

    this.setDefaults();
    this.setParsers();

    this.nodes = new NodesClient(pool);
    this.usages = new UsagesClient(pool);
  }

  public init(): Promise<void> {
    if (!this.initialized) {
      return Promise.resolve();
    }

    return Promise.all([this.usages.init(), this.nodes.init()]).then(() => {
      // Flatten promise
    });
  }

  private setParsers(): void {
    PGTypes.setTypeParser(PGTypes.builtins.INT8, (val) => parseInt(val));
  }

  private setDefaults(): void {
    PGDefaults.poolSize = 1;
  }
}
