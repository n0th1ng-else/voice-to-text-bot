import { Logger } from "../logger";

const logger = new Logger("daemon");

export class ScheduleDaemon<TickData> {
  private readonly interval = 60_000;
  private readonly printId: string;
  private handler: NodeJS.Timeout | null = null;
  private shouldStop?: (data: TickData) => boolean;
  private onFinish?: () => Promise<void>;

  public get isRunning(): boolean {
    return !!this.handler;
  }

  constructor(
    private readonly id: string,
    private readonly onTick: () => Promise<TickData>
  ) {
    this.printId = `[${this.id}]`;
  }

  public setStopHandler(
    shouldStop: (data: TickData) => boolean,
    onFinish: () => Promise<void>
  ): this {
    this.shouldStop = shouldStop;
    this.onFinish = onFinish;
    return this;
  }

  public start(): this {
    if (this.isRunning) {
      logger.warn(`${Logger.y(this.printId)} Daemon is already running`);
      return this;
    }

    logger.info(`${Logger.g(this.printId)} Launching the daemon`);
    this.runTick();
    this.handler = setInterval(() => this.runTick(), this.interval);
    return this;
  }

  public stop(): void {
    if (!this.isRunning) {
      logger.warn(`${Logger.y(this.printId)} Daemon has already stopped`);
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
          `${Logger.g(this.printId)} Daemon tick executed successfully`
        );
        return this.stopIfNeeded(data);
      })
      .catch((err) =>
        logger.error(
          `${Logger.r(this.printId)} Error occurred during the tick execution`,
          err
        )
      );
  }

  private stopIfNeeded(data: TickData): Promise<void> {
    if (!this.shouldStop || !this.onFinish) {
      return Promise.resolve();
    }

    logger.info(`${Logger.g(this.printId)} Evaluating if daemon needs to stop`);
    if (!this.shouldStop(data)) {
      logger.info(
        `${Logger.g(this.printId)} Daemon is live and waiting for the next tick`
      );
      return Promise.resolve();
    }

    logger.info(`${Logger.g(this.printId)} Daemon is about to stop`);
    return this.onFinish().then(() => this.stop());
  }
}
