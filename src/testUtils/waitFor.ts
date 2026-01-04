import type { VoidFunction } from "../common/types.js";

export class WaiterForCalls {
  private times = 0;
  private calledTimes = 0;
  private promise?: Promise<void>;
  private resolve?: VoidFunction;

  constructor() {
    this.reset();
  }

  public async waitForCondition(): Promise<void> {
    if (!this.promise) {
      return;
    }

    return this.promise;
  }

  public tick(): void {
    this.calledTimes++;

    if (this.calledTimes === this.times && this.resolve) {
      this.resolve();
    }
  }

  public reset(times = 0): void {
    this.times = times;
    this.calledTimes = 0;

    const { promise, resolve } = Promise.withResolvers<void>();
    this.promise = promise;
    this.resolve = resolve;
  }

  public toString(): string {
    return `Recorded ticks: ${this.calledTimes} of ${this.times}`;
  }
}
