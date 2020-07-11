import onExit from "signal-exit";
import { Logger } from "../logger";

const logger = new Logger("stop-listener");

export class StopListener {
  private triggers: Array<() => Promise<void>> = [];

  constructor() {
    onExit((code, signal) => {
      logger.error("Exit signal received", { code, signal });

      Promise.all(this.triggers.map((trigger) => trigger()))
        .then(() => logger.info("All triggers executed"))
        .catch((err) => logger.error("Unable to execute triggers", err));
    });
  }

  public addTrigger(fn: () => void | Promise<void>): this {
    const promisify = () => Promise.resolve().then(() => fn());
    this.triggers.push(promisify);
    return this;
  }
}
