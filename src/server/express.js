const http = require("http");
const https = require("https");
const express = require("express");
const httpsData = require("../../certs");
const { writeOutput } = require("../logger");

class ExpressServer {
  #app = null;
  #httpsOptions = {};

  constructor() {
    writeOutput("Initializing express server");

    this.#httpsOptions = {
      cert: httpsData.cert,
      key: httpsData.key,
    };

    this.#app = express();
    this.#app.use(express.json());
    this.#app.get("/health", (req, res) =>
      res.status(200).send({ status: "ONLINE" })
    );
  }

  setBots(bots = []) {
    writeOutput(`${bots.length} bots to set up`);

    bots.map((bot) => {
      this.#app.post(bot.getPath(), (req, res) => {
        bot.handleApiMessage(req);
        res.sendStatus(200);
      });
    });
  }

  start(port, isHttps = true) {
    writeOutput(`Starting http${isHttps ? "s" : ""} server`);

    const server = isHttps
      ? https.createServer(this.#httpsOptions, this.#app)
      : http.createServer(this.#app);
    server.listen(port, () => {
      writeOutput(`Express server is listening on ${port}`);
    });
  }
}

module.exports = {
  ExpressServer,
};
