import type { Pool } from "pg";

export abstract class CoreDbClient {
  protected initialized = false;
  protected readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public abstract init(): Promise<void>;
}
