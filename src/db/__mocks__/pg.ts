import { Pool as PGPool, PoolConfig, PoolClient } from "pg";
import { EventEmitter } from "events";
import { nanoid } from "nanoid";

type AnyTypeForMock = any;

export class Pool extends EventEmitter implements PGPool {
  public readonly idleCount = 0;
  public readonly totalCount = 0;
  public readonly waitingCount = 0;

  private mockQueue: MockSql[] = [];

  constructor(config: PoolConfig) {
    super();
  }

  public connect(): Promise<PoolClient>;
  public connect(): Promise<PoolClient> | void {
    return;
  }

  public end(): Promise<void>;
  public end(): Promise<void> | void {
    return;
  }

  public query(
    queryStream: AnyTypeForMock,
    values?: AnyTypeForMock
  ): Promise<AnyTypeForMock> {
    const queryRecord = this.mockQueue.find(
      (mockItem) => mockItem.sql === queryStream
    );
    if (!queryRecord) {
      return Promise.reject(new Error(`Unexpected sql ${queryStream}`));
    }

    this.mockQueue = this.mockQueue.filter(
      (mockItem) => mockItem.id !== queryRecord.id
    );
    return queryRecord.handler(values);
  }

  public isDone(): boolean {
    return !this.mockQueue.length;
  }

  public mockQuery(
    query: string,
    handler: (values: AnyTypeForMock[]) => Promise<AnyTypeForMock>
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
      values: AnyTypeForMock[]
    ) => Promise<AnyTypeForMock>
  ) {}
}
