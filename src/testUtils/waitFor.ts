export class WaiterForCalls {
  private times = 0;
  private calledTimes = 0;
  private promise?: Promise<void>;
  private resolve?: () => void;

  constructor() {
    this.reset();
  }

  public waitForCondition(): Promise<void> {
    if (!this.promise) {
      return Promise.resolve();
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

    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
}
