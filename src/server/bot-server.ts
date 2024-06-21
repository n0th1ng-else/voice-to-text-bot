import { createServer as createHttp } from "node:http";
import { createServer as createHttps } from "node:https";
import express, { type Response, type Express } from "express";
import { Logger } from "../logger/index.js";
import { sSuffix } from "../text/utils.js";
import { BotServerBase } from "./bot-server-base.js";
import { AnalyticsData } from "../analytics/ga/types.js";
import { flattenPromise } from "../common/helpers.js";
import { collectAnalytics } from "../analytics/index.js";
import { TgUpdateSchema } from "../telegram/api/types.js";
import { initSentry } from "../monitoring/sentry.js";
import {
  type BotServerModel,
  type HealthDto,
  type ServerStatCore,
  HealthModel,
} from "./types.js";
import type { TelegramBotModel } from "../telegram/bot.js";
import type { HttpsOptions } from "../../certs/index.js";
import type { VoidPromise } from "../common/types.js";

const logger = new Logger("server");

export class BotServer
  extends BotServerBase<Express>
  implements BotServerModel
{
  constructor(
    port: number,
    version: string,
    webhookDoNotWait: boolean,
    httpsOptions?: HttpsOptions,
  ) {
    super("ExpressJS", port, version, webhookDoNotWait, httpsOptions);

    initSentry();

    this.app.use("/static", express.static("assets/v2"));

    const statusHandler = (
      res: Response<HealthDto>,
      db: ServerStatCore | null,
    ): void => {
      const status = new HealthModel(
        this.version,
        this.isHttps,
        this.threadId,
        this.serverName,
      );
      if (this.isIdle) {
        status.setMessage("App is not connected to the Telegram server");
        res.status(400).send(status.getDto());
        return;
      }

      if (!db?.isReady()) {
        logger.warn("Database is not ready");
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

    this.app.get("/health", (_req, res: Response<HealthDto>) => {
      statusHandler(res, this.stat);
    });
    this.app.get("/favicon.ico", (_req, res: Response<string>) => {
      res.status(204).send("");
    });
    this.app.get("/", (_req, res: Response<string>) => {
      logger.info("Received app root request");
      res.status(200).send("The app is running");
    });
    this.app.post("/lifecycle", (req, res: Response<HealthDto>) => {
      logger.warn("Received app:restart hook from the buddy node", req.body);
      statusHandler(res, this.stat);
    });
  }

  public setBots(bots: TelegramBotModel[] = []): this {
    super.setBots(bots);

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
          logger.debug("Incoming message validated");

          if (this.webhookDoNotWait) {
            res.sendStatus(200);
            logger.debug("Webhook response sent");
          }

          return bot
            .handleApiMessage(payload, analytics)
            .catch((err) => {
              logger.error("Incoming message failed to handle", err);
            })
            .finally(() => {
              if (this.webhookDoNotWait) {
                return;
              }
              res.sendStatus(200);
              logger.debug("Webhook response sent");
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

  public start(): Promise<VoidPromise> {
    const isHttps = Boolean(this.httpsOptions);
    logger.info(`Starting ${Logger.y(sSuffix("http", isHttps))} server`);

    const server = this.httpsOptions
      ? createHttps(this.httpsOptions, this.app)
      : createHttp(this.app);

    return new Promise((resolve) => {
      server.listen(this.port, () => {
        logger.info(`The bot server is listening on ${Logger.y(this.port)}`);
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
                  logger.error("Unable to stop the bot server", err);
                  rejectFn(err);
                  return;
                }

                logger.warn("The bot server has stopped");
                resolveFn();
              });
            }),
        );
      });
    });
  }

  public async applyHostLocation(timeoutMs = 0): Promise<void> {
    logger.info("Setting up bot hooks");
    return Promise.all(
      this.bots.map((bot) => bot.applyHostLocationIfNeeded(timeoutMs)),
    ).then(() => {
      this.isIdle = false;
      logger.info("Instance is successfully set as a hook receiver");
    });
  }

  public async triggerDaemon(
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
          "Next instance url is not set for this node. Unable to set up the daemon",
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

      return this.stat
        .updateNodeState(this.selfUrl, true, this.version)
        .then(flattenPromise);
    });
  }

  protected getServerInstance(): Express {
    const app = express();
    app.use(express.json());
    return app;
  }
}
