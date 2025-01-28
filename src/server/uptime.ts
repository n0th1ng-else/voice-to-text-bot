import { ScheduleDaemon } from "../scheduler/index.ts";
import { Logger } from "../logger/index.ts";
import { HealthStatus } from "./types.ts";
import { sSuffix } from "../text/utils.ts";
import { requestHealthData } from "./api.ts";
import type { getDb } from "../db/index.ts";

const logger = new Logger("uptime");

export class UptimeDaemon {
  private static readonly minLifecycleInterval = 1;
  private readonly daemon: ScheduleDaemon<void>;
  private readonly version: string;

  private currentUrl = "";
  private nextUrl = "";
  private lifecycleInterval = UptimeDaemon.minLifecycleInterval;
  private daysRunning = new Set<number>();
  private stat: ReturnType<typeof getDb> | null = null;

  public get isRunning(): boolean {
    return this.daemon.isRunning;
  }

  constructor(version = "") {
    this.version = version;
    this.daemon = new ScheduleDaemon("uptime", () =>
      this.onTick(),
    ).setStopHandler(
      () => this.shouldStop(),
      () => this.onFinish(),
    );
  }

  public stop(): void {
    this.daysRunning = new Set();
    this.daemon.stop();
    logger.warn(`Daemon stopped and ${Logger.y("I am going to hibernate")}`);
  }

  public start(): void {
    this.daysRunning = new Set();
    this.daemon.start();
  }

  public setUrls(current: string, next: string): this {
    this.currentUrl = current;
    this.nextUrl = next;
    return this;
  }

  public setIntervalDays(interval: number): this {
    const minInterval = UptimeDaemon.minLifecycleInterval;

    if (interval < minInterval) {
      logger.warn(
        `Lifecycle interval can not be less than 1 day. Falling back to 1 (Received ${interval})`,
      );
    }

    this.lifecycleInterval = interval < minInterval ? minInterval : interval;

    logger.info(
      `Lifecycle interval is set to ${Logger.y(
        sSuffix("day", this.lifecycleInterval),
      )}`,
    );

    return this;
  }

  public setStat(stat: ReturnType<typeof getDb>): this {
    this.stat = stat;
    return this;
  }

  public getCurrent(): { current: number; limit: number } {
    if (this.isRunning) {
      return {
        current: this.daysRunning.size,
        limit: this.lifecycleInterval,
      };
    }

    return {
      current: 0,
      limit: 0,
    };
  }

  private async onTick(): Promise<void> {
    const currentDay = new Date().getDate();
    this.daysRunning.add(currentDay);

    const daysRunning = [...this.daysRunning].join(", ");
    logger.info(
      `Daemon tick. Today is ${Logger.y(
        currentDay,
      )} and I have been running for (${Logger.y(daysRunning)}) already`,
    );

    const health = await requestHealthData(this.currentUrl);
    if (health.status !== HealthStatus.Online) {
      logger.error("Node status is not ok", health);
      throw new Error("Node status is not ok");
    }
    logger.info(`Ping completed with result: ${Logger.y(health.status)}`);

    const isCallbackOwner = health.urls.every((url) =>
      url.includes(this.currentUrl),
    );

    if (!isCallbackOwner && this.isRunning) {
      this.stop();

      logger.warn(`Callback is not owned by ${Logger.y("this")} node`);

      if (!this.stat) {
        return;
      }

      const isActive = false;
      await this.stat.updateNodeState(this.currentUrl, isActive, this.version);
    }
  }

  private async onFinish(): Promise<void> {
    const health = await requestHealthData(this.nextUrl);
    if (health.status !== HealthStatus.Online) {
      logger.error("Buddy node status is not ok", health);
      throw new Error("Buddy node status is not ok");
    }

    logger.warn(
      `Delegated callback to the ${Logger.y("next node")} ${Logger.y(
        this.nextUrl,
      )}`,
    );

    if (!this.stat) {
      return;
    }

    const isActive = false;
    await this.stat.updateNodeState(this.currentUrl, isActive, this.version);
  }

  private shouldStop(): boolean {
    const currentInterval = this.daysRunning.size;
    const shouldStop = currentInterval > this.lifecycleInterval;

    if (shouldStop) {
      logger.warn(
        "Lifecycle limit reached. Delegating execution to the next node",
      );
    }

    return shouldStop;
  }
}
