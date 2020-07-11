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
  ngRokToken,
  cacheSize,
  memoryLimit,
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
import { getHostName } from "../server/tunnel";
import { ScheduleDaemon } from "../scheduler";
import { printCurrentMemoryStat } from "../memory";
import { StopListener } from "../process";

const logger = new Logger("start-script");

export function run(): void {
  const server = new ExpressServer(appPort, enableSSL, appVersion);

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
    dbStat.masterKey,
    cacheSize
  );
  const bot = new TelegramBotModel(telegramBotApi, converter, stat).setAuthor(
    authorTelegramAccount
  );

  const daemon = new ScheduleDaemon("memory", () =>
    printCurrentMemoryStat(memoryLimit)
  ).start();
  const stopListener = new StopListener().addTrigger(() => daemon.stop());

  getHostName(appPort, selfUrl, ngRokToken)
    .then((host) => {
      logger.info(`Telling telegram our location is ${Logger.y(host)}`);
      bot.setHostLocation(host);
      return server.setSelfUrl(host).setBots([bot]).setStat(stat).start();
    })
    .then((stopFn) => {
      stopListener.addTrigger(() => stopFn());
      return server.triggerDaemon(nextReplicaUrl, replicaLifecycleInterval);
    })
    .catch((err) => logger.error("Failed to run the server", err));
}
