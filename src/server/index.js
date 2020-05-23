const https = require("https");
const express = require("express");
const { createTunnel } = require("./tunnel");
const { VoiceConverterProvider, VoiceConverter } = require("../recognition");
const httpsData = require("../../certs");
const envy = require("../../env.json");
const { writeOutput, writeError } = require("../logger");
const { TelegramBotModel } = require("../telegram/bot");

const converter = new VoiceConverter(
  envy.PROVIDER || VoiceConverterProvider.aws,
  envy
);

const model = new TelegramBotModel(envy.TELEGRAM_BOT_API, converter);

(async function start() {
  writeOutput("Creating tunnel");
  createTunnel(envy.PORT)
    .then((host) => {
      writeOutput(`Telling telegram our location is ${host}`);
      return model.setHostLocation(host, "/bot/message");
    })
    .then(() => {
      writeOutput("Creating local server");

      const app = express();

      app.use(express.json());
      app.get("/health", (req, res) =>
        res.status(200).send({ status: "ONLINE" })
      );

      app.post(model.getPath(), (req, res) => {
        model.handleApiMessage(req);
        res.sendStatus(200);
      });

      https
        .createServer(
          {
            cert: httpsData.cert,
            key: httpsData.key,
          },
          app
        )
        .listen(envy.PORT, () => {
          writeOutput(`Express server is listening on ${envy.PORT}`);
        });
    })
    .catch((err) => {
      writeError(err);
    });
})();
