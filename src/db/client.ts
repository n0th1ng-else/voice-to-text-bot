import pg, { type PoolConfig } from "pg";
import { Logger } from "../logger/index.ts";
import { getHostDomain } from "../common/url.ts";
import { type DbConnectionConfig, validateConfigState } from "./utils.ts";
import { NodesClient } from "./nodes.ts";
import { UsagesClient } from "./usages.ts";
import { DonationsClient } from "./donations.ts";
import { UsedEmailClient } from "./emails.ts";
import { DurationsClient } from "./durations.ts";
import { IgnoredChatsClient } from "./ignoredchats.ts";

const { Pool } = pg;
const logger = new Logger("postgres-client");

const getPool = (config: DbConnectionConfig, threadId: number): pg.Pool => {
  const sslOpts: Pick<PoolConfig, "ssl"> = config.certificate
    ? {
        ssl: {
          rejectUnauthorized: true,
          ca: config.certificate,
        },
      }
    : {
        ssl: {
          rejectUnauthorized: false,
        },
      };
  return new Pool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: config.port,
    max: 1,
    application_name: `sql-stream-replica-${threadId}`,
    ...sslOpts,
  });
};

export class DbClient {
  public readonly nodes: NodesClient;
  public readonly usages: UsagesClient;
  public readonly donations: DonationsClient;
  public readonly emails: UsedEmailClient;
  public readonly durations: DurationsClient;
  public readonly ignoredChats: IgnoredChatsClient;

  private readonly initialized: boolean;
  private ready = false;

  constructor(config: DbConnectionConfig, threadId = 0, p?: pg.Pool) {
    const configState = validateConfigState(config);
    const domain = config.host ? getHostDomain(config.host) : "missing.domain";
    logger.info(`Initializing the database ${Logger.y(domain)}`);
    this.initialized = configState !== "invalid";
    if (!this.initialized) {
      logger.error(
        `Missing connection data for postgres server. Check the config for ${Logger.y(
          domain,
        )}`,
        new Error("Missing connection data for postgres server", {
          cause: {
            domain,
          },
        }),
      );
    }
    if (configState === "unsecure") {
      logger.warn(
        `Postgres connection is not secure, ssl certificate is not provided for ${Logger.y(
          domain,
        )}`,
      );
    }

    this.setDefaults();
    const pool = p ?? getPool(config, threadId);
    this.setParsers();

    this.nodes = new NodesClient(pool);
    this.usages = new UsagesClient(pool);
    this.donations = new DonationsClient(pool);
    this.emails = new UsedEmailClient(pool);
    this.durations = new DurationsClient(pool);
    this.ignoredChats = new IgnoredChatsClient(pool);
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
      this.durations.init(),
      this.ignoredChats.init(),
    ]).then(() => {
      this.ready = true;
    });
  }

  public isReady(): boolean {
    return this.ready;
  }

  public setSecondary(): this {
    this.nodes.setSecondary();
    this.usages.setSecondary();
    this.donations.setSecondary();
    this.emails.setSecondary();
    this.durations.setSecondary();
    this.ignoredChats.setSecondary();
    return this;
  }

  private setParsers(): void {
    pg.types.setTypeParser(pg.types.builtins.INT8, (val) => parseInt(val));
  }

  private setDefaults(): void {
    pg.defaults.poolSize = 1;
  }
}
