import express from "express";
import { createServer as createHttp } from "http";
import { createServer as createHttps } from "https";
import { Logger } from "../logger";
import { TelegramBotModel } from "../telegram/bot";
import { HttpsOptions } from "../../certs";
import { HealthDto, HealthModel } from "./types";
import { sSuffix } from "../text";
import { UptimeDaemon } from "./uptime";
import { DbClient } from "../db";
import { flattenPromise } from "../common/helpers";
import { AnalyticsData } from "../analytics/api/types";

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
    private readonly httpsOptions: HttpsOptions
  ) {
    logger.info("Initializing express server");

    this.uptimeDaemon = new UptimeDaemon(version);

    this.app.use(express.json());

    const statusHandler = (
      req: express.Request,
      res: express.Response<HealthDto>
    ): void => {
      const status = new HealthModel(this.version, this.isHttps, this.threadId);
      if (this.isIdle) {
        res.status(400).send(status.getDto());
        return;
      }

      Promise.all(this.bots.map((bot) => bot.getHostLocation()))
        .then((urls) => {
          status.setOnline(urls);
          res.status(200).send(status.getDto());
        })
        .catch((err) => {
          const errMessage = "Unable to get bot urls";
          logger.error(errMessage, err);
          status.setError(errMessage);
          res.status(400).send(status.getDto());
        });
    };

    this.app.get(
      "/health",
      (req: express.Request, res: express.Response<HealthDto>) =>
        statusHandler(req, res)
    );
    this.app.post(
      "/lifecycle",
      (req: express.Request, res: express.Response<HealthDto>) => {
        logger.warn("Received app:restart hook from the buddy node", req.body);
        statusHandler(req, res);
      }
    );
  }

  public setStat(stat: DbClient): this {
    this.stat = stat;
    this.uptimeDaemon.setStat(stat);
    return this;
  }

  public setThreadId(threadId = 0): this {
    this.threadId = threadId;
    if (this.threadId) {
      logger.setAdditionalPrefix(`thread-${this.threadId}`);
    }
    return this;
  }

  public setBots(bots: TelegramBotModel[] = []): this {
    this.bots = bots;
    logger.info(`Requested ${Logger.y(sSuffix("bot", bots.length))} to set up`);

    bots.forEach((bot) => {
      logger.warn(`Setting up a handler for ${Logger.y(bot.getPath())}`);
      this.app.post(bot.getPath(), (req, res) => {
        logger.info("Incoming message");
        const analytics = new AnalyticsData(
          this.version,
          this.selfUrl,
          this.threadId
        );
        bot.handleApiMessage(req.body, analytics);
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
            })
        );
      });
    });
  }

  public applyHostLocation(timeoutMs = 0): Promise<void> {
    logger.info("Setting up bot hooks");
    return Promise.all(
      this.bots.map((bot) => bot.applyHostLocationIfNeeded(timeoutMs))
    ).then(() => {
      this.isIdle = false;
      logger.info("Node is successfully set to be a hook receiver");
    });
  }

  public triggerDaemon(
    nextReplicaUrl: string,
    lifecycleInterval: number,
    timeoutMs = 0
  ): Promise<void> {
    if (!this.selfUrl) {
      return Promise.reject(
        new Error(
          "Self url is not set for this node. Unable to set up the daemon"
        )
      );
    }

    if (!nextReplicaUrl) {
      return Promise.reject(
        new Error(
          "Next node url is not set for this node. Unable to set up the daemon"
        )
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
