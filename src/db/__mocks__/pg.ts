import { EventEmitter } from "node:events";
import pg from "pg";
import { nanoid } from "nanoid";
import { NodesSql } from "../sql/nodes.sql.js";
import { UsagesSql } from "../sql/usages.sql.js";
import { DonationsSql } from "../sql/donations.sql.js";
import { UsedEmailsSql } from "../sql/emails.sql.js";
import { IgnoredChatsSql } from "../sql/ignoredchats.sql.js";
import { DurationsSql } from "../sql/durations.sql.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTypeForMock = any;

export class Pool extends EventEmitter implements pg.Pool {
  public readonly idleCount = 0;
  public readonly totalCount = 0;
  public readonly waitingCount = 0;

  public readonly options: pg.PoolOptions = {
    allowExitOnIdle: false,
    idleTimeoutMillis: null,
    max: 1,
    maxLifetimeSeconds: 10,
    maxUses: 0,
  } as const;

  private mockQueue: MockSql[] = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_config: pg.PoolConfig) {
    super();
  }

  public connect(): Promise<pg.PoolClient>;
  public connect(): Promise<pg.PoolClient> | void {
    return;
  }

  public end(): Promise<void>;
  public end(): Promise<void> | void {
    return;
  }

  public query(
    queryStream: AnyTypeForMock,
    values?: AnyTypeForMock,
  ): Promise<AnyTypeForMock> {
    const queryRecord = this.mockQueue.find(
      (mockItem) => mockItem.sql === queryStream,
    );
    if (!queryRecord) {
      return Promise.reject(new Error(`Unexpected sql ${queryStream}`));
    }

    this.mockQueue = this.mockQueue.filter(
      (mockItem) => mockItem.id !== queryRecord.id,
    );
    return queryRecord.handler(values);
  }

  public isDone(): boolean {
    return !this.mockQueue.length;
  }

  public mockQuery(
    query: string,
    handler: (values: AnyTypeForMock[]) => Promise<AnyTypeForMock>,
  ): void {
    this.mockQueue.push(new MockSql(query, handler));
  }
}

export const types = {
  setTypeParser(): void {
    // Mock
  },
  builtins: {
    INT8: 8,
  },
};

export const defaults = {
  poolSize: 1,
};

class MockSql {
  public readonly id = nanoid();
  constructor(
    public readonly sql: string,
    public readonly handler: (
      values: AnyTypeForMock[],
    ) => Promise<AnyTypeForMock>,
  ) {}
}

export const mockTableCreation = (testPool: Pool) => {
  testPool.mockQuery(NodesSql.createTable, () => Promise.resolve());
  testPool.mockQuery(UsagesSql.createTable, () => Promise.resolve());
  testPool.mockQuery(DonationsSql.createTable, () => Promise.resolve());
  testPool.mockQuery(UsedEmailsSql.createTable, () => Promise.resolve());
  testPool.mockQuery(DurationsSql.createTable, () => Promise.resolve());
  testPool.mockQuery(IgnoredChatsSql.createTable, () => Promise.resolve());
};
