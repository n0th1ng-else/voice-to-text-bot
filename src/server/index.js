const https = require("https");
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const { createTunnel } = require("./tunnel");
const { VoiceConverterProvider, VoiceConverter } = require("../recognition");
const httpsData = require("../../certs");
const envy = require("../../env.json");
const { writeOutput, writeError } = require("../logger");

const bot = new TelegramBot(envy.TELEGRAM_BOT_API);
const converter = new VoiceConverter(
  envy.PROVIDER || VoiceConverterProvider.aws,
  envy
);

(async function start() {
  writeOutput("Creating tunnel");
  createTunnel(envy.PORT)
    .then((host) => {
      writeOutput(`Telling telegram our location is ${host}`);
      return bot.setWebHook(`${host}/bot/message`);
    })
    .then(() => {
      writeOutput("Creating local server");

      const app = express();

      app.use(express.json());
      app.get("/bot/message", (req, res) => res.status(200).send({ ok: "ok" }));
      app.get("/health", (req, res) =>
        res.status(200).send({ status: "ONLINE" })
      );

      app.post(`/bot/message`, (req, res) => {
        bot.processUpdate(req.body);
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

      bot.on("message", (msg) => {
        if (!msg.voice) {
          bot.sendMessage(msg.chat.id, "Content is not supported 🌚");
          return;
        }

        bot
          .getFileLink(msg.voice.file_id)
          .then((fileLink) => {
            writeOutput("New link", fileLink);
            bot.sendMessage(msg.chat.id, "Processing voice message 🎙");
            return converter.transformToText(fileLink, msg.voice);
          })
          .then((text) => bot.sendMessage(msg.chat.id, `🗣 ${text}`))
          .catch((err) => {
            bot.sendMessage(msg.chat.id, "Unable to convert 😔");
            writeError(err);
          });
      });
    })
    .catch((err) => {
      writeError(err);
    });
})();
