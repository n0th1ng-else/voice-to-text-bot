import { ScheduleDaemon } from "../scheduler";
import { Logger } from "../logger";
import { runGetDto } from "./request";
import { HealthDto, HealthStatus } from "./types";
import { sSuffix } from "../text";
import { getHealthUrl } from "./helpers";
import { DbClient } from "../db";
import { flattenPromise } from "../common/helpers";

const logger = new Logger("uptime");

export class UptimeDaemon {
  private static readonly minLifecycleInterval = 1;
  private readonly daemon: ScheduleDaemon<void>;

  private currentUrl = "";
  private nextUrl = "";
  private lifecycleInterval = UptimeDaemon.minLifecycleInterval;
  private daysRunning: number[] = [];
  private stat: DbClient | null = null;

  public get isRunning(): boolean {
    return this.daemon.isRunning;
  }

  constructor(private readonly version = "") {
    this.daemon = new ScheduleDaemon("uptime", () =>
      this.onTick()
    ).setStopHandler(
      () => this.shouldStop(),
      () => this.onFinish()
    );
  }

  public stop(): void {
    this.daysRunning = [];
    this.daemon.stop();
    logger.warn(`Daemon stopped and ${Logger.y("I am going to hibernate")}`);
  }

  public start(): void {
    this.daysRunning = [];
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
        `Lifecycle interval can not be less than 1 day. Falling back to 1 (Received ${interval})`
      );
    }

    this.lifecycleInterval = interval < minInterval ? minInterval : interval;

    logger.info(
      `Lifecycle interval is set to ${Logger.y(
        sSuffix("day", this.lifecycleInterval)
      )}`
    );

    return this;
  }

  public setStat(stat: DbClient): this {
    this.stat = stat;
    return this;
  }

  private onTick(): Promise<void> {
    const currentDay = new Date().getDate();
    if (!this.daysRunning.includes(currentDay)) {
      this.daysRunning.push(currentDay);
    }

    const daysRunning = this.daysRunning.join(", ");
    logger.info(
      `Daemon tick. Today is ${Logger.y(
        currentDay
      )} and I have been running for (${Logger.y(daysRunning)}) already`
    );

    return runGetDto<HealthDto>(getHealthUrl(this.currentUrl)).then(
      (health) => {
        if (health.status !== HealthStatus.Online) {
          logger.error("Node status is not ok", health);
          throw new Error("Node status is not ok");
        }

        logger.info(`Ping completed with result: ${Logger.y(health.status)}`);

        const isCallbackOwner = health.urls.every((url) =>
          url.includes(this.currentUrl)
        );

        if (!isCallbackOwner && this.isRunning) {
          this.stop();

          logger.warn(`Callback is not owned by ${Logger.y("this")} node`);

          if (!this.stat) {
            return;
          }

          const isActive = false;
          return this.stat.nodes
            .updateState(this.currentUrl, isActive, this.version)
            .then(flattenPromise);
        }
      }
    );
  }

  private onFinish(): Promise<void> {
    return runGetDto<HealthDto>(getHealthUrl(this.nextUrl)).then((health) => {
      if (health.status !== HealthStatus.Online) {
        logger.error("Buddy node status is not ok", health);
        throw new Error("Buddy node status is not ok");
      }

      logger.warn(
        `Delegated callback to the ${Logger.y("next node")} ${Logger.y(
          this.nextUrl
        )}`
      );

      if (!this.stat) {
        return;
      }

      const isActive = false;
      return this.stat.nodes
        .updateState(this.currentUrl, isActive, this.version)
        .then(flattenPromise);
    });
  }

  private shouldStop(): boolean {
    const currentInterval = this.daysRunning.length;
    const shouldStop = currentInterval > this.lifecycleInterval;

    if (shouldStop) {
      logger.warn(
        "Lifecycle limit reached. Delegating execution to the next node"
      );
    }

    return shouldStop;
  }
}
