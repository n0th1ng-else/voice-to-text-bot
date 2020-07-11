import { Logger } from "../logger";

const logger = new Logger("daemon");

export class ScheduleDaemon<TickData> {
  private readonly interval = 60_000;
  private handler: NodeJS.Timeout | null = null;
  private shouldStop?: (data: TickData) => boolean;
  private onFinish?: () => Promise<void>;

  public get isRunning(): boolean {
    return !!this.handler;
  }

  constructor(
    private readonly id: string,
    private readonly onTick: () => Promise<TickData>
  ) {}

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
      logger.warn(`[${this.id}] Daemon is already running`);
      return this;
    }

    logger.info(`[${this.id}] Launching the daemon`);
    this.runTick();
    this.handler = setInterval(() => this.runTick(), this.interval);
    return this;
  }

  public stop(): void {
    if (!this.isRunning) {
      logger.warn(`[${this.id}] Daemon has already stopped`);
      return;
    }

    logger.info(`[${this.id}] Stopping the daemon`);

    if (!this.handler) {
      throw new Error("Unable to clear the interval");
    }

    clearInterval(this.handler);
    this.handler = null;
  }

  private runTick(): void {
    logger.info(`[${this.id}] Running daemon tick`);
    this.onTick()
      .then((data) => {
        logger.info(`[${this.id}] Daemon tick executed successfully`);
        return this.stopIfNeeded(data);
      })
      .catch((err) =>
        logger.error(
          `[${this.id}] Error occurred during the tick execution`,
          err
        )
      );
  }

  private stopIfNeeded(data: TickData): Promise<void> {
    if (!this.shouldStop || !this.onFinish) {
      return Promise.resolve();
    }

    logger.info(`[${this.id}] Evaluating if daemon needs to stop`);
    if (!this.shouldStop(data)) {
      logger.info(`[${this.id}] Daemon up to the next tick`);
      return Promise.resolve();
    }

    logger.info(`[${this.id}] Daemon is about to stop`);
    return this.onFinish().then(() => this.stop());
  }
}
