const http = require("http");
const https = require("https");
const express = require("express");
const httpsData = require("../../certs");
const { writeOutput, Logger } = require("../logger");
const { enableSSL } = require("../env");

const logger = new Logger("server");

class ExpressServer {
  #scheduler = null;
  #schedulerPingInterval = 60_000;
  #daemon = null;
  #daemonInterval = 60_000;
  #dayStart = 0;
  #dayEnd = 0;
  #selfUrl = "";
  #port = 0;
  #isHttps = false;
  #app = null;
  #httpsOptions = {};
  #active = false;
  #bots = [];

  constructor(port, isHttps, selfUrl) {
    writeOutput("Initializing express server");
    this.#port = port;
    this.#isHttps = isHttps;
    this.#selfUrl = selfUrl;

    this.#httpsOptions = {
      cert: httpsData.cert,
      key: httpsData.key,
    };

    this.#app = express();
    this.#app.use(express.json());
    this.#app.get("/health", (req, res) =>
      res.status(200).send({ status: "ONLINE", ssl: enableSSL ? "on" : "off" })
    );
  }

  setBots(bots = []) {
    this.#bots = bots;
    writeOutput(`${bots.length} bots to set up`);

    bots.map((bot) => {
      this.#app.post(bot.getPath(), (req, res) => {
        bot.handleApiMessage(req);
        res.sendStatus(200);
      });
    });
  }

  start() {
    writeOutput(`Starting http${this.#isHttps ? "s" : ""} server`);

    const server = this.#isHttps
      ? https.createServer(this.#httpsOptions, this.#app)
      : http.createServer(this.#app);

    return new Promise((resolve) => {
      server.listen(this.#port, () => {
        writeOutput(`Express server is listening on ${this.#port}`);
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

  triggerDaemon(replicaCount, replicaIndex) {
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

  _scheduleDaemon() {
    this._runDaemon();
    this.#daemon = setInterval(() => this._runDaemon(), this.#daemonInterval);
  }

  _runDaemon() {
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

  _schedulePing() {
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
      .catch((err) => logger.err("Unable to set up bots routing", err));
  }

  _clearPing() {
    if (!this.#active) {
      return;
    }
    this.#active = false;
    if (this.#scheduler) {
      clearInterval(this.#scheduler);
      this.#scheduler = null;
    }
  }

  _runPing() {
    const url = `${this.#selfUrl}/health`;
    logger.info("Triggering ping event for url", url);

    https
      .get(url, (response) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => {
          const obj = JSON.parse(body);
          logger.info("Ping completed with result: ", obj.status);
        });
      })
      .on("error", (err) => logger.error("Got an error: ", err));
  }
}

module.exports = {
  ExpressServer,
};
