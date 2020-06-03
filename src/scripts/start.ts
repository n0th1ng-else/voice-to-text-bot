import {
  appPort,
  enableSSL,
  provider,
  selfUrl,
  telegramBotApi,
  googleApi,
  dbStat,
  nextReplicaUrl,
  replicaLifecycleInterval,
  authorTelegramAccount,
  appVersion,
} from "../env";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../recognition";
import { VoiceConverterOptions } from "../recognition/types";
import { Logger } from "../logger";
import { StatisticApi } from "../statistic";
import { TelegramBotModel } from "../telegram/bot";
import { ExpressServer } from "../server/express";

const logger = new Logger("run handler");

export function run(): void {
  const server = new ExpressServer(appPort, enableSSL, appVersion).setSelfUrl(
    selfUrl
  );
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
  const bot = new TelegramBotModel(telegramBotApi, converter, stat)
    .setHostLocation(selfUrl)
    .setAuthor(authorTelegramAccount);

  server
    .setBots([bot])
    .setStat(stat)
    .start()
    .then(() => server.triggerDaemon(nextReplicaUrl, replicaLifecycleInterval))
    .catch((err: Error) => logger.error("Failed to run the server", err));
}
