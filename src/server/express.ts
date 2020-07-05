import express from "express";
import { createServer as createHttp } from "http";
import { createServer as createHttps } from "https";
import { Logger } from "../logger";
import { TelegramBotModel } from "../telegram/bot";
import { httpsCert, httpsKey, HttpsOptions } from "../../certs";
import { HealthDto, HealthSsl, HealthStatus } from "./types";
import { runGetDto } from "./request";
import { StatisticApi } from "../statistic";
import { sleepForRandom } from "../common/timer";
import { sSuffix } from "../text";

const logger = new Logger("server");

export class ExpressServer {
  private readonly daemonInterval = 60_000;
  private readonly app = express();
  private readonly httpsOptions: HttpsOptions;

  private stat: StatisticApi | null = null;
  private bots: TelegramBotModel[] = [];
  private isIdle = true;
  private lifecycleInterval = 1;
  private nextReplicaUrl = "";
  private daemon: NodeJS.Timeout | null = null;
  private daysRunning: number[] = [];
  private selfUrl = "";

  constructor(
    private readonly port: number,
    private readonly isHttps: boolean,
    private readonly version: string
  ) {
    logger.info("Initializing express server");

    this.httpsOptions = {
      cert: httpsCert,
      key: httpsKey,
    };

    this.app.use(express.json());
    this.app.get("/health", (req, res) => {
      if (this.isIdle) {
        const status: HealthDto = {
          status: HealthStatus.InProgress,
          ssl: this.isHttps ? HealthSsl.On : HealthSsl.Off,
          message: "Waiting for bots to set up",
          urls: [],
          version: this.version,
        };
        res.status(400).send(status);
        return;
      }

      Promise.all(this.bots.map((bot) => bot.getHostLocation()))
        .then((urls) => {
          const status: HealthDto = {
            status: HealthStatus.Online,
            ssl: this.isHttps ? HealthSsl.On : HealthSsl.Off,
            message: "All is good",
            urls,
            version: this.version,
          };
          res.status(200).send(status);
        })
        .catch((err) => {
          logger.error("Unable to get bot urls", err);
          const status: HealthDto = {
            status: HealthStatus.Error,
            ssl: this.isHttps ? HealthSsl.On : HealthSsl.Off,
            message: "Unable to get bot urls",
            urls: [],
            version: this.version,
          };
          res.status(400).send(status);
        });
    });
  }

  public setStat(stat: StatisticApi): this {
    this.stat = stat;
    return this;
  }

  public setBots(bots: TelegramBotModel[] = []): this {
    this.bots = bots;
    logger.info(`Requested ${Logger.y(sSuffix("bot", bots.length))} to set up`);

    bots.forEach((bot) => {
      logger.warn(`Setting up a handler for ${Logger.y(bot.getPath())}`);
      this.app.post(bot.getPath(), (req, res) => {
        bot.handleApiMessage(req.body);
        res.sendStatus(200);
      });

      this.app.get(bot.getPath(), (req, res, next) => {
        logger.info("Route is enabled");
        next();
      });
    });

    this.app.use((req, res) => {
      logger.error(`Unknown route ${Logger.y(req.originalUrl)}`);

      res
        .status(404)
        .send({ status: 404, message: "Route not found", error: "Not found" });
    });

    return this;
  }

  public setSelfUrl(url: string): this {
    this.selfUrl = url;
    return this;
  }

  public start(): Promise<() => Promise<void>> {
    logger.info(`Starting ${Logger.y(sSuffix("http", this.isHttps))} server`);

    const server = this.isHttps
      ? createHttps(this.httpsOptions, this.app)
      : createHttp(this.app);

    return new Promise((resolve) => {
      server.listen(this.port, () => {
        logger.info(`Express server is listening on ${Logger.y(this.port)}`);
        resolve(
          () =>
            new Promise((resolveFn, rejectFn) => {
              if (this.daemon) {
                clearInterval(this.daemon);
              }
              server.close((err) => (err ? rejectFn(err) : resolveFn()));
            })
        );
      });
    });
  }

  public applyHostLocation(): Promise<void> {
    return Promise.all(this.bots.map((bot) => bot.applyHostLocation())).then(
      () => {
        this.isIdle = false;
      }
    );
  }

  public triggerDaemon(
    nextReplicaUrl: string,
    lifecycleInterval: number
  ): void {
    if (!nextReplicaUrl) {
      logger.warn(
        "Next replica url is not set for this node. Unable to set up the daemon"
      );
      return;
    }

    if (lifecycleInterval < 1) {
      logger.warn(
        `Lifecycle interval can not be less than 1 day. Falling back to 1 (Received ${lifecycleInterval})`
      );
    }

    this.lifecycleInterval = lifecycleInterval < 1 ? 1 : lifecycleInterval;
    this.nextReplicaUrl = nextReplicaUrl;
    this.daysRunning = [];
    logger.info(
      `Lifecycle interval is set to ${Logger.y(
        sSuffix("day", this.lifecycleInterval)
      )}`
    );

    sleepForRandom()
      .then(() => this.applyHostLocation())
      .then(() => this.scheduleDaemon())
      .then(
        () =>
          this.stat &&
          this.stat.node.toggleActive(this.selfUrl, true, this.version)
      )
      .catch((err) => logger.error("Unable to schedule replica", err));
  }

  private scheduleDaemon(): void {
    this.runDaemon();
    this.daemon = setInterval(() => this.runDaemon(), this.daemonInterval);
  }

  private runDaemon(): void {
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
    const currentInterval = this.daysRunning.length;
    if (currentInterval > this.lifecycleInterval) {
      logger.warn(
        "Lifecycle limit reached. Delegating execution to the next node"
      );
      runGetDto<HealthDto>(this.getHealthUrl(this.nextReplicaUrl))
        .then((health) => {
          if (health.status !== HealthStatus.Online) {
            logger.error("Buddy replica status is not ok", health);
            return;
          }

          if (!this.daemon) {
            return;
          }
          clearInterval(this.daemon);
          this.daysRunning = [];
          this.isIdle = true;

          logger.warn(
            `Delegated callback to the buddy node. Daemon stopped and ${Logger.y(
              "I am going to hibernate"
            )}`
          );

          return (
            this.stat &&
            this.stat.node.toggleActive(this.selfUrl, false, this.version)
          );
        })
        .catch((err) =>
          logger.error("Unable to delegate logic. Keep working", err)
        );
      return;
    }

    runGetDto<HealthDto>(this.getHealthUrl())
      .then((health) => {
        if (health.status !== HealthStatus.Online) {
          logger.error("Replica status is not ok", health);
          return;
        }
        logger.info(`Ping completed with result: ${Logger.y(health.status)}`);

        const isCallbackOwner = health.urls.every((url) =>
          url.includes(this.selfUrl)
        );

        if (!isCallbackOwner && this.daemon) {
          clearInterval(this.daemon);
          this.daysRunning = [];
          this.isIdle = true;

          logger.warn(
            `Callback is not owner by this node. Daemon stopped and ${Logger.y(
              "I am going to hibernate"
            )}`
          );
          return (
            this.stat &&
            this.stat.node.toggleActive(this.selfUrl, false, this.version)
          );
        }
      })
      .catch((err) => logger.error("Unable to ping myself!", err));
  }

  private getHealthUrl(url = this.selfUrl): string {
    return `${url}/health`;
  }
}
