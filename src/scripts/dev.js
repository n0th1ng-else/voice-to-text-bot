const { getHostName } = require("../server/tunnel");
const { getVoiceConverterProvider, VoiceConverter } = require("../recognition");
const { writeOutput, writeError } = require("../logger");
const { TelegramBotModel } = require("../telegram/bot");
const { ExpressServer } = require("../server/express");
const envy = require("../../env.json");

(async function start() {
  const converter = new VoiceConverter(getVoiceConverterProvider(envy), envy);

  const bot = new TelegramBotModel(envy.TELEGRAM_BOT_API, converter);
  const server = new ExpressServer();

  getHostName(envy)
    .then((host) => {
      writeOutput(`Telling telegram our location is ${host}`);
      return bot.setHostLocation(host, "/bot/message");
    })
    .then(() => {
      server.setBots([bot]);
      server.start(envy.PORT, envy.USE_SSL === "true");
    })
    .catch((err) => {
      writeError(err);
    });
})();
