import { Logger } from "../logger/index.js";
import type { VoidPromise } from "../common/types.js";

const logger = new Logger("daemon");

type Options = {
  interval?: number;
  skipInitialTick?: boolean;
};

export class ScheduleDaemon<TickData> {
  private readonly interval: number;
  private readonly skipInitialTick: boolean;
  private readonly printId: string;
  private readonly id: string;
  private readonly onTick: () => Promise<TickData>;
  private handler: NodeJS.Timeout | null = null;
  private shouldStop?: (data: TickData) => boolean;
  private onFinish?: VoidPromise;

  public get isRunning(): boolean {
    return !!this.handler;
  }

  constructor(
    id: string,
    onTick: () => Promise<TickData>,
    options: Options = {},
  ) {
    this.id = id;
    this.onTick = onTick;
    this.printId = `[${this.id}]`;
    this.interval = options.interval ?? 60_000;
    this.skipInitialTick = options.skipInitialTick ?? false;
  }

  public setStopHandler(
    shouldStop: (data: TickData) => boolean,
    onFinish: VoidPromise,
  ): this {
    this.shouldStop = shouldStop;
    this.onFinish = onFinish;
    return this;
  }

  public start(): this {
    if (this.isRunning) {
      logger.warn(
        `${Logger.y(this.printId)} Daemon is already running`,
        {},
        true,
      );
      return this;
    }

    logger.info(`${Logger.g(this.printId)} Launching the daemon`);
    if (!this.skipInitialTick) {
      this.runTick();
    } else {
      logger.info(`${Logger.g(this.printId)} Skipped initial tick`);
    }
    this.handler = setInterval(() => this.runTick(), this.interval);
    return this;
  }

  public stop(): void {
    if (!this.isRunning) {
      logger.warn(
        `${Logger.y(this.printId)} Daemon has already stopped`,
        {},
        true,
      );
      return;
    }

    logger.info(`${Logger.g(this.printId)} Stopping the daemon`);

    if (!this.handler) {
      throw new Error("Unable to clear the interval");
    }

    clearInterval(this.handler);
    this.handler = null;
  }

  private runTick(): void {
    logger.info(`${Logger.g(this.printId)} Running daemon tick`);
    this.onTick()
      .then((data) => {
        logger.info(
          `${Logger.g(this.printId)} Daemon tick executed successfully`,
        );
        return this.stopIfNeeded(data);
      })
      .catch((err) =>
        logger.error(
          `${Logger.r(this.printId)} Error occurred during the tick execution`,
          err,
        ),
      );
  }

  private stopIfNeeded(data: TickData): Promise<void> {
    if (!this.shouldStop || !this.onFinish) {
      return Promise.resolve();
    }

    logger.info(`${Logger.g(this.printId)} Evaluating if daemon needs to stop`);
    if (!this.shouldStop(data)) {
      logger.info(
        `${Logger.g(
          this.printId,
        )} Daemon is live and waiting for the next tick`,
      );
      return Promise.resolve();
    }

    logger.info(`${Logger.g(this.printId)} Daemon is about to stop`);
    return this.onFinish().then(() => this.stop());
  }
}
