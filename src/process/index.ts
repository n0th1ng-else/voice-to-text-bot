import { onExit } from "signal-exit";
import { Logger } from "../logger/index.js";
import type { VoidFunction, VoidPromise } from "../common/types.js";

const logger = new Logger("stop-listener");

export class StopListener {
  private readonly triggers: VoidPromise[] = [];

  constructor() {
    onExit((code, signal) => {
      logger.error("Exit signal received", {
        code,
        signal,
      });
      this.notifyAllListeners();
    });
  }

  public addTrigger(fn: VoidFunction | VoidPromise): this {
    const promisify = () => Promise.resolve().then(() => fn());
    this.triggers.push(promisify);
    return this;
  }

  private notifyAllListeners(): void {
    logger.info("Running all stop handlers");
    Promise.all(this.triggers.map((trigger) => trigger()))
      .then(() => logger.info("All triggers executed"))
      .catch((err) => logger.error("Unable to execute triggers", err));
  }
}
