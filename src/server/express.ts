import express from "express";
import { createServer as createHttp } from "http";
import { createServer as createHttps, get as runGet } from "https";
import { Logger } from "../logger";
import Timeout = NodeJS.Timeout;
import { TelegramBotModel } from "../telegram/bot";
import { httpsCert, httpsKey, HttpsOptions } from "../../certs";

const logger = new Logger("server");

export class ExpressServer {
  #scheduler: Timeout | null = null;
  #schedulerPingInterval = 60_000;
  #daemon: Timeout | null = null;
  #daemonInterval = 60_000;
  #dayStart = 0;
  #dayEnd = 0;
  #selfUrl = "";
  #port = 0;
  #isHttps = false;
  #app = express();
  #httpsOptions: HttpsOptions;
  #active = false;
  #bots: TelegramBotModel[] = [];

  constructor(port: number, isHttps: boolean, selfUrl: string) {
    logger.info("Initializing express server");
    this.#port = port;
    this.#isHttps = isHttps;
    this.#selfUrl = selfUrl;

    this.#httpsOptions = {
      cert: httpsCert,
      key: httpsKey,
    };

    this.#app.use(express.json());
    this.#app.get("/health", (req, res) =>
      res
        .status(200)
        .send({ status: "ONLINE", ssl: this.#isHttps ? "on" : "off" })
    );
  }

  setBots(bots: TelegramBotModel[] = []): this {
    this.#bots = bots;
    logger.info(`${bots.length} bots to set up`);

    bots.forEach((bot) => {
      this.#app.post(bot.getPath(), (req, res) => {
        bot.handleApiMessage(req.body);
        res.sendStatus(200);
      });
    });

    return this;
  }

  start(): Promise<() => Promise<void>> {
    logger.info(`Starting http${this.#isHttps ? "s" : ""} server`);

    const server = this.#isHttps
      ? createHttps(this.#httpsOptions, this.#app)
      : createHttp(this.#app);

    return new Promise((resolve) => {
      server.listen(this.#port, () => {
        logger.info(`Express server is listening on ${this.#port}`);
        resolve(
          () =>
            new Promise((resolve, reject) => {
              if (this.#scheduler) {
                clearInterval(this.#scheduler);
              }
              server.close((err) => (err ? reject(err) : resolve()));
            })
        );
      });
    });
  }

  triggerDaemon(replicaCount: number, replicaIndex: number): void {
    const replicaNextIndex = replicaIndex + 1;
    logger.info(
      `This replica index is ${replicaNextIndex} out of ${replicaCount} in the pool`
    );
    const daysInMonth = 31;
    const daysOverlap = 2;
    const pingStart = Math.ceil(daysInMonth / replicaCount);
    const dayStart = replicaIndex * pingStart - daysOverlap;
    const dayEnd = replicaNextIndex * pingStart + daysOverlap;
    this.#dayStart = dayStart < 0 ? 0 : dayStart;
    this.#dayEnd = dayEnd > daysInMonth ? daysInMonth : dayEnd;
    this._scheduleDaemon();
  }

  _scheduleDaemon(): void {
    this._runDaemon();
    this.#daemon = setInterval(() => this._runDaemon(), this.#daemonInterval);
  }

  _runDaemon(): void {
    const currentDay = new Date().getDate();
    logger.info(
      `This replica covers days from ${this.#dayStart} to ${
        this.#dayEnd
      }. Today is ${currentDay}`
    );
    if (
      currentDay >= this.#dayStart &&
      currentDay <= this.#dayEnd &&
      !this.#active
    ) {
      this._schedulePing();
    } else {
      this._clearPing();
    }
  }

  _schedulePing(): void {
    if (this.#active) {
      return;
    }
    this.#active = true;
    this._runPing();
    this.#scheduler = setInterval(
      () => this._runPing(),
      this.#schedulerPingInterval
    );

    Promise.all(
      this.#bots.map((bot) =>
        bot.setHostLocation(this.#selfUrl, "/bot/message")
      )
    )
      .then(() => logger.info("Bots are set up to use this replica"))
      .catch((err) => logger.error("Unable to set up bots routing", err));
  }

  _clearPing(): void {
    if (!this.#active) {
      return;
    }
    this.#active = false;
    if (this.#scheduler) {
      clearInterval(this.#scheduler);
      this.#scheduler = null;
    }
  }

  _runPing(): void {
    const url = `${this.#selfUrl}/health`;
    logger.info("Triggering ping event for url", url);

    runGet(url, (response) => {
      let body = "";
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => {
        const obj = JSON.parse(body);
        logger.info("Ping completed with result: ", obj.status);
      });
    }).on("error", (err) => logger.error("Got an error: ", err));
  }
}
