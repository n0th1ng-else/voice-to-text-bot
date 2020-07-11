import {
  appPort,
  enableSSL,
  googleApi,
  provider,
  selfUrl,
  telegramBotApi,
  dbStat,
  ngRokToken,
  authorTelegramAccount,
  appVersion,
  cacheSize,
} from "../env";
import { Logger } from "../logger";
import { VoiceConverterOptions } from "../recognition/types";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../recognition";
import { getHostName } from "../server/tunnel";
import { StatisticApi } from "../statistic";
import { TelegramBotModel } from "../telegram/bot";
import { ExpressServer } from "../server/express";
import { StopListener } from "../process";

const logger = new Logger("dev-script");

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

  const stopListener = new StopListener();

  getHostName(appPort, selfUrl, ngRokToken)
    .then((host) => {
      logger.info(`Telling telegram our location is ${Logger.y(host)}`);
      bot.setHostLocation(host);
      return server
        .setSelfUrl(host)
        .setBots([bot])
        .setStat(stat)
        .applyHostLocation();
    })
    .then(() => server.start())
    .then((onStop) => stopListener.addTrigger(() => onStop()))
    .catch((err: Error) => logger.error("Failed to run dev instance", err));
}
