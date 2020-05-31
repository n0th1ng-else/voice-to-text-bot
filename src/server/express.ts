import express from "express";
import { createServer as createHttp } from "http";
import { createServer as createHttps } from "https";
import { Logger } from "../logger";
import { TelegramBotModel } from "../telegram/bot";
import { httpsCert, httpsKey, HttpsOptions } from "../../certs";
import { HealthDto, HealthSsl, HealthStatus } from "./types";
import { sleepForRandom } from "./timer";
import { runGet } from "./request";

const logger = new Logger("server");

export class ExpressServer {
  private readonly daemonInterval = 60_000;
  private readonly app = express();
  private readonly httpsOptions: HttpsOptions;

  private bots: TelegramBotModel[] = [];
  private isIdle = false;
  private lifecycleInterval = 1;
  private nextReplicaUrl = "";
  private daemon: NodeJS.Timeout | null = null;
  private daysRunning: number[] = [];

  constructor(
    private readonly port: number,
    private readonly isHttps: boolean,
    private readonly selfUrl: string
  ) {
    logger.info("Initializing express server");

    this.httpsOptions = {
      cert: httpsCert,
      key: httpsKey,
    };

    this.app.use(express.json());
    this.app.get("/health", (req, res) => {
      if (!this.isIdle) {
        const status: HealthDto = {
          status: HealthStatus.InProgress,
          ssl: this.isHttps ? HealthSsl.On : HealthSsl.Off,
          message: "Waiting for bots to set up",
          urls: [],
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
          };
          res.status(400).send(status);
        });
    });
  }

  public setBots(bots: TelegramBotModel[] = []): this {
    this.bots = bots;
    this.isIdle = true;
    logger.info(`${bots.length} bots to set up`);

    bots.forEach((bot) => {
      logger.warn("Setting up a handler for", bot.getPath());
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
      logger.error("Unknown route", req.originalUrl);

      res
        .status(404)
        .send({ status: 404, message: "Route not found", error: "Not found" });
    });

    return this;
  }

  public start(): Promise<() => Promise<void>> {
    logger.info(`Starting http${this.isHttps ? "s" : ""} server`);

    const server = this.isHttps
      ? createHttps(this.httpsOptions, this.app)
      : createHttp(this.app);

    return new Promise((resolve) => {
      server.listen(this.port, () => {
        logger.info(`Express server is listening on ${this.port}`);
        resolve(
          () =>
            new Promise((resolve, reject) => {
              if (this.daemon) {
                clearInterval(this.daemon);
              }
              server.close((err) => (err ? reject(err) : resolve()));
            })
        );
      });
    });
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

    this.lifecycleInterval = lifecycleInterval;
    this.nextReplicaUrl = nextReplicaUrl;
    this.daysRunning = [];
    logger.info(
      `Lifecycle interval is set to ${this.lifecycleInterval} day${
        this.lifecycleInterval === 1 ? "" : "s"
      }`
    );

    sleepForRandom()
      .then(() => Promise.all(this.bots.map((bot) => bot.applyHostLocation())))
      .then(() => this.scheduleDaemon())
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
    logger.info(
      `Daemon tick. Today is ${currentDay} and I have been running for ${this.daysRunning.join(
        ","
      )} already`
    );
    const currentInterval = this.daysRunning.length;
    if (currentInterval >= this.lifecycleInterval) {
      runGet<HealthDto>(this.getHealthUrl(this.nextReplicaUrl))
        .then((health) => {
          if (health.status !== HealthStatus.Online) {
            logger.error("Buddy replica status is not ok", health);
            return;
          }

          if (this.daemon) {
            clearInterval(this.daemon);
            this.daysRunning = [];
            logger.warn(
              "Delegated callback for the buddy node. Daemon stopped and I am going to hibernate"
            );
          }
        })
        .catch((err) => logger.error("Unable to delegate logic", err));
      return;
    }

    runGet<HealthDto>(this.getHealthUrl())
      .then((health) => {
        if (health.status !== HealthStatus.Online) {
          logger.error("Replica status is not ok", health);
          return;
        }
        logger.info("Ping completed with result: ", health.status);

        const isCallbackOwner = health.urls.every((url) =>
          url.includes(this.selfUrl)
        );
        if (!isCallbackOwner && this.daemon) {
          clearInterval(this.daemon);
          this.daysRunning = [];
          logger.warn(
            "Callback is not owner by this node. Daemon stopped and I am going to hibernate"
          );
        }
      })
      .catch((err) => logger.error("Unable to ping myself!", err));
  }

  private getHealthUrl(url = this.selfUrl): string {
    return `${url}/health`;
  }
}
