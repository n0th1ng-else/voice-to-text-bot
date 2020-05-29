const { getVoiceConverterProvider, VoiceConverter } = require("../recognition");
const { ExpressServer } = require("../server/express");
const { TelegramBotModel } = require("../telegram/bot");
const {
  appPort,
  enableSSL,
  provider,
  replicaCount,
  replicaIndex,
  selfUrl,
  telegramBotApi,
} = require("../env");

(async function start() {
  const server = new ExpressServer(appPort, enableSSL, selfUrl);
  const converterOptions = {};
  const converter = new VoiceConverter(
    getVoiceConverterProvider(provider),
    converterOptions
  );

  const bot = new TelegramBotModel(telegramBotApi, converter);

  server.setBots([bot]);
  server.start().then((stopHandler) => {
    server.triggerDaemon(replicaCount, replicaIndex);
  });
})();
