import Fastify, { type FastifyInstance } from "fastify";
import { Logger } from "../logger/index.js";
import { UptimeDaemon } from "./uptime.js";
import { AnalyticsData } from "../analytics/ga/types.js";
import { initSentryNew, trackAPIHandlersNew } from "../monitoring/sentry.js";
import { collectAnalytics } from "../analytics/index.js";
import { sSuffix } from "../text/utils.js";
import { isFileExist, readFile } from "../files/index.js";
import { flattenPromise } from "../common/helpers.js";
import { TgUpdateSchema } from "../telegram/api/types.js";
import {
  type BotServerModel,
  type HealthDto,
  HealthModel,
  type ServerStatCore,
  type NotFoundDto,
} from "./types.js";
import type { VoidPromise } from "../common/types.js";
import type { HttpsOptions } from "../../certs/index.js";
import type { TelegramBotModel } from "../telegram/bot.js";

const logger = new Logger("server");

export class BotServerNew implements BotServerModel {
  private readonly app: FastifyInstance;
  private readonly uptimeDaemon: UptimeDaemon;
  private readonly isHttps: boolean;

  private stat: ServerStatCore | null = null;
  private bots: TelegramBotModel[] = [];
  private isIdle = true;
  private selfUrl = "";
  private threadId = 0;

  public readonly serverName = "Fastify";

  constructor(
    private readonly port: number,
    private readonly version: string,
    private readonly webhookDoNotWait: boolean,
    httpsOptions?: HttpsOptions,
  ) {
    logger.info("Initializing the bot server server");

    this.uptimeDaemon = new UptimeDaemon(this.version);
    this.isHttps = Boolean(httpsOptions);

    const httpsOpts = this.isHttps
      ? {
          https: httpsOptions,
        }
      : {};

    this.app = Fastify({
      ...httpsOpts,
      bodyLimit: 1024 * 1024 * 100, // 100 MB
    });

    initSentryNew();
    trackAPIHandlersNew(this.app);

    this.app.get<{ Reply: string }>("/favicon.ico", async (_req, reply) => {
      return reply.status(204).type("image/vnd.microsoft.icon").send("");
    });

    this.app.get<{ Reply: string }>("/", async (_req, reply) => {
      logger.info("Received app root request");
      return reply.status(200).type("text/plain").send("The app is running");
    });

    this.app.get<{ Params: { path: string }; Reply: Buffer }>(
      "/static/:path",
      async (req, reply) => {
        const assetPath = new URL(
          `../../assets/v2/${req.params.path}`,
          import.meta.url,
        );
        const isExists = await isFileExist(assetPath);
        if (!isExists) {
          return reply.callNotFound();
        }
        const buffer = await readFile(assetPath);
        return reply.type("image/png").send(buffer);
      },
    );

    this.app.get<{ Reply: HealthDto }>("/health", async (_req, reply) => {
      const [status, dto] = await this.getStatusHandler();
      return reply.status(status).send(dto);
    });

    this.app.post<{ Reply: HealthDto }>("/lifecycle", async (req, reply) => {
      logger.warn("Received app:restart hook from the buddy node", req.body);
      const [status, dto] = await this.getStatusHandler();
      return reply.status(status).send(dto);
    });

    this.app.setNotFoundHandler<{ Reply: NotFoundDto }>(async (req, reply) => {
      const err = new Error("Unknown route", {
        cause: { path: req.originalUrl },
      });
      logger.error(`Unknown route ${Logger.y(req.originalUrl)}`, err);
      const analytics = new AnalyticsData(
        this.version,
        this.selfUrl,
        this.threadId,
      );

      analytics
        .addError("Unknown route for the host")
        .setCommand("/app", "Server route not found");

      await collectAnalytics(analytics);
      return reply.status(404).send({
        status: 404,
        message: "Route not found",
        error: "Not found",
      });
    });

    this.app.setErrorHandler(async (error, _req, reply) => {
      logger.error("Router error", error);
      const analytics = new AnalyticsData(
        this.version,
        this.selfUrl,
        this.threadId,
      );

      analytics.addError("Router error").setCommand("/app", "Server error");

      await collectAnalytics(analytics);
      return reply.status(500).send({ error: "Something went wrong" });
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

  public setBots(bots: TelegramBotModel[] = []): this {
    this.bots = bots;
    logger.info(`Requested ${Logger.y(sSuffix("bot", bots.length))} to set up`);

    bots.forEach((bot) => {
      logger.warn(`Setting up a handler for ${Logger.y(bot.getPath())}`);
      this.app.post<{ Params: { id: string }; Body: unknown; Reply: "" }>(
        bot.getPath(":id"),
        async (req, reply) => {
          const routeId = req.params.id;
          const botId = bot.getId();
          if (routeId !== botId) {
            logger.warn(
              "Wrong route id! Perhaps because of the cache on Telegram side.",
              {
                routeId,
                botId,
                method: req.method,
                url: req.originalUrl,
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
              logger.debug("Webhook response sent");
              return reply.status(200).send("");
            }

            return bot
              .handleApiMessage(payload, analytics)
              .catch((err) => {
                logger.error("Incoming message failed to handle", err);
              })
              .then(() => {
                if (this.webhookDoNotWait) {
                  return;
                }
                logger.debug("Webhook response sent");
                return reply.status(200).send("");
              });
          } catch (err) {
            logger.error("Incoming message failed validation", err);
            return reply.status(200).send("");
          }
        },
      );

      this.app.get<{ Params: { id: string }; Reply: string }>(
        bot.getPath(":id"),
        async (req, reply) => {
          const routeId = req.params.id;
          const botId = bot.getId();
          if (routeId !== botId) {
            logger.warn(
              "Wrong route id! Perhaps because of the cache on Telegram side.",
              {
                routeId,
                botId,
                method: req.method,
                url: req.originalUrl,
              },
            );
          }

          return reply.status(200).type("text/plain").send("Route is enabled");
        },
      );
    });

    return this;
  }

  public setSelfUrl(url: string): this {
    this.selfUrl = url;
    return this;
  }

  public setStat(stat: ServerStatCore): this {
    this.stat = stat;
    this.uptimeDaemon.setStat(stat);
    return this;
  }

  public setThreadId(threadId: number): this {
    this.threadId = threadId;
    return this;
  }

  public async start(): Promise<VoidPromise> {
    logger.info(`Starting ${Logger.y(sSuffix("http", this.isHttps))} server`);
    const fullUrl = await this.app.listen({ port: this.port });
    logger.info(`The bot server is deployed on ${Logger.y(fullUrl)}`);

    return async () => {
      logger.warn("Shutting down the server instance");
      if (this.uptimeDaemon.isRunning) {
        logger.warn("Stopping the daemon");
        this.uptimeDaemon.stop();
      }

      try {
        await this.app.close();
        logger.warn("The bot server has stopped");
      } catch (err) {
        logger.error("Unable to stop the bot server", err);
        return Promise.reject(err);
      }
    };
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

  private async getStatusHandler(): Promise<[number, HealthDto]> {
    const status = new HealthModel(
      this.version,
      this.isHttps,
      this.threadId,
      this.serverName,
    );
    if (this.isIdle) {
      status.setMessage("App is not connected to the Telegram server");
      return [400, status.getDto()];
    }

    if (!this.stat?.isReady()) {
      logger.warn("Database is not ready");
      // TODO fix behavior
      // const errMessage = "Database is not ready";
      // logger.error(errMessage, new Error(errMessage));
      // status.setMessage("Database is not ready");
      // res.status(400).send(status.getDto());
      // return;
    }

    try {
      const urls = await Promise.all(
        this.bots.map((bot) => bot.getHostLocation()),
      );
      status.setOnline(urls);
      return [200, status.getDto()];
    } catch (err) {
      const errMessage = "Unable to get bot urls";
      logger.error(errMessage, err);
      status.setMessage(errMessage, true);
      return [400, status.getDto()];
    }
  }
}
