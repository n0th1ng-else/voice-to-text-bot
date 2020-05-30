import { TelegramBotModel } from "../telegram/bot";
import { ExpressServer } from "../server/express";
import {
  appPort,
  enableSSL,
  provider,
  replicaCount,
  replicaIndex,
  selfUrl,
  telegramBotApi,
  googleApi,
  dbStat,
} from "../env";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../recognition";
import { VoiceConverterOptions } from "../recognition/types";
import { Logger } from "../logger";
import { StatisticApi } from "../statistic";

const logger = new Logger("run handler");

export function run() {
  const server = new ExpressServer(appPort, enableSSL, selfUrl);
  const converterOptions: VoiceConverterOptions = {
    googlePrivateKey: googleApi.privateKey,
    googleProjectId: googleApi.projectId,
    googleClientEmail: googleApi.clientEmail,
  };
  const converter = getVoiceConverterInstance(
    getVoiceConverterProvider(provider),
    converterOptions
  );

  const stat = new StatisticApi(
    dbStat.statUrl,
    dbStat.appId,
    dbStat.appKey,
    dbStat.masterKey
  );
  const bot = new TelegramBotModel(telegramBotApi, converter, stat);

  server
    .setBots([bot])
    .start()
    .then(() => server.triggerDaemon(replicaCount, replicaIndex))
    .catch((err: Error) => logger.error(err));
}
