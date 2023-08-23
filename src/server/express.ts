import { createServer as createHttp } from "node:http";
import { createServer as createHttps } from "node:https";
import express from "express";
import { Logger } from "../logger/index.js";
import { TelegramBotModel } from "../telegram/bot.js";
import { HttpsOptions } from "../../certs/index.js";
import { HealthDto, HealthModel } from "./types.js";
import { sSuffix } from "../text/index.js";
import { UptimeDaemon } from "./uptime.js";
import { DbClient } from "../db/index.js";
import { flattenPromise } from "../common/helpers.js";
import { AnalyticsData } from "../analytics/ga/types.js";
import { collectAnalytics } from "../analytics/index.js";
import { TgUpdateSchema } from "../telegram/api/types.js";
import { initSentry, trackAPIHandlers } from "../monitoring/sentry.js";
import type { VoidPromise } from "../common/types.js";

const logger = new Logger("server");

export class ExpressServer {
  private readonly app = express();
  private readonly uptimeDaemon: UptimeDaemon;

  private stat: DbClient | null = null;
  private bots: TelegramBotModel[] = [];
  private isIdle = true;
  private selfUrl = "";
  private threadId = 0;

  constructor(
    private readonly port: number,
    private readonly isHttps: boolean,
    private readonly version: string,
    private readonly httpsOptions: HttpsOptions,
  ) {
    logger.info("Initializing express server");

    this.uptimeDaemon = new UptimeDaemon(version);

    initSentry(this.app);
    trackAPIHandlers(this.app);
    this.app.use(express.json());
    this.app.use("/static", express.static("assets/v2"));

    const statusHandler = (
      db: DbClient | null,
      res: express.Response<HealthDto>,
    ): void => {
      const status = new HealthModel(this.version, this.isHttps, this.threadId);
      if (this.isIdle) {
        status.setMessage("App is not connected to the Telegram server");
        res.status(400).send(status.getDto());
        return;
      }

      if (!db?.isReady()) {
        // TODO fix behavior
        // const errMessage = "Database is not ready";
        // logger.error(errMessage, new Error(errMessage));
        // status.setMessage("Database is not ready");
        // res.status(400).send(status.getDto());
        // return;
      }

      Promise.all(this.bots.map((bot) => bot.getHostLocation()))
        .then((urls) => {
          status.setOnline(urls);
          res.status(200).send(status.getDto());
        })
        .catch((err) => {
          const errMessage = "Unable to get bot urls";
          logger.error(errMessage, err);
          status.setMessage(errMessage, true);
          res.status(400).send(status.getDto());
        });
    };

    this.app.get("/health", (_req, res: express.Response<HealthDto>) => {
      statusHandler(this.stat, res);
    });
    this.app.get("/favicon.ico", (_req, res: express.Response<string>) => {
      res.status(204).send("");
    });
    this.app.get("/", (_req, res: express.Response<string>) => {
      logger.info("Received app root request");
      res.status(200).send("The app is running");
    });
    this.app.post("/lifecycle", (req, res: express.Response<HealthDto>) => {
      logger.warn("Received app:restart hook from the buddy node", req.body);
      statusHandler(this.stat, res);
    });
  }

  public setStat(stat: DbClient): this {
    this.stat = stat;
    this.uptimeDaemon.setStat(stat);
    return this;
  }

  public setThreadId(threadId = 0): this {
    this.threadId = threadId;
    return this;
  }

  public setBots(bots: TelegramBotModel[] = []): this {
    this.bots = bots;
    logger.info(`Requested ${Logger.y(sSuffix("bot", bots.length))} to set up`);

    bots.forEach((bot) => {
      logger.warn(`Setting up a handler for ${Logger.y(bot.getPath())}`);
      this.app.post(bot.getPath(":id"), (req, res) => {
        if (req.params.id !== bot.getId()) {
          logger.warn(
            "Wrong route id! Perhaps because of the cache on Telegram side.",
            {
              routeId: req.params.id,
              botId: bot.getId(),
            },
          );
        }

        const analytics = new AnalyticsData(
          this.version,
          this.selfUrl,
          this.threadId,
        );

        try {
          const payload = TgUpdateSchema.parse(req.body);
          logger.info("Incoming message validated");
          return bot
            .handleApiMessage(payload, analytics)
            .catch((err) => {
              logger.error("Incoming message failed to handle", err);
            })
            .finally(() => {
              res.sendStatus(200);
            });
        } catch (err) {
          logger.error("Incoming message failed validation", err);
          res.sendStatus(200);
        }
      });

      this.app.get(bot.getPath(":id"), (req, _res, next) => {
        if (req.params.id !== bot.getId()) {
          logger.warn(
            "Wrong route id! Perhaps because of the cache on Telegram side.",
            {
              routeId: req.params.id,
              botId: bot.getId(),
            },
          );
        }

        logger.info("Route is enabled");
        next();
      });
    });

    this.app.use((req, res) => {
      const err = new Error("Unknown route");
      logger.error(`Unknown route ${Logger.y(req.originalUrl)}`, err);
      const analytics = new AnalyticsData(
        this.version,
        this.selfUrl,
        this.threadId,
      );

      analytics.addError("Unknown route for the host");

      return collectAnalytics(
        analytics.setCommand("/app", "Server route not found"),
      ).then(() => {
        res.status(404).send({
          status: 404,
          message: "Route not found",
          error: "Not found",
        });
      });
    });

    return this;
  }

  public setSelfUrl(url: string): this {
    this.selfUrl = url;
    return this;
  }

  public start(): Promise<VoidPromise> {
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
              logger.warn("Shutting down the server instance");
              if (this.uptimeDaemon.isRunning) {
                logger.warn("Stopping the daemon");
                this.uptimeDaemon.stop();
              }

              server.close((err) => {
                if (err) {
                  logger.error("Unable to stop express server", err);
                  rejectFn(err);
                  return;
                }

                logger.warn("Express server has stopped");
                resolveFn();
              });
            }),
        );
      });
    });
  }

  public applyHostLocation(timeoutMs = 0): Promise<void> {
    logger.info("Setting up bot hooks");
    return Promise.all(
      this.bots.map((bot) => bot.applyHostLocationIfNeeded(timeoutMs)),
    ).then(() => {
      this.isIdle = false;
      logger.info("Node is successfully set to be a hook receiver");
    });
  }

  public triggerDaemon(
    nextReplicaUrl: string,
    lifecycleInterval: number,
    timeoutMs = 0,
  ): Promise<void> {
    if (!this.selfUrl) {
      return Promise.reject(
        new Error(
          "Self url is not set for this node. Unable to set up the daemon",
        ),
      );
    }

    if (!nextReplicaUrl) {
      return Promise.reject(
        new Error(
          "Next node url is not set for this node. Unable to set up the daemon",
        ),
      );
    }

    this.uptimeDaemon
      .setUrls(this.selfUrl, nextReplicaUrl)
      .setIntervalDays(lifecycleInterval);

    return this.applyHostLocation(timeoutMs).then(() => {
      this.uptimeDaemon.start();

      if (!this.stat) {
        return;
      }

      return this.stat.nodes
        .updateState(this.selfUrl, true, this.version)
        .then(flattenPromise);
    });
  }
}
