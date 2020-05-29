const { VoiceConverterProvider } = require("./recognition");

const appPort = process.env.PORT;

const enableSSL = process.env.ENABLE_SSL === "true";

const provider = process.env.PROVIDER || VoiceConverterProvider.Google;

const selfUrl = process.env.SELF_URL;

const replicaCount = Number(process.env.REPLICA_COUNT) || 1;

const replicaIndex = Number(process.env.REPLICA_INDEX);

const telegramBotApi = process.env.TELEGRAM_BOT_API;

module.exports = {
  appPort,
  enableSSL,
  provider,
  selfUrl,
  replicaCount,
  replicaIndex,
  telegramBotApi,
};
