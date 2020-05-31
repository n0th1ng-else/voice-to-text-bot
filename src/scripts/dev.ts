import { TelegramBotModel } from "../telegram/bot";
import { ExpressServer } from "../server/express";
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
} from "../env";
import { Logger } from "../logger";
import { VoiceConverterOptions } from "../recognition/types";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../recognition";
import { getHostName } from "../server/tunnel";
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
  const bot = new TelegramBotModel(telegramBotApi, converter, stat).setAuthor(
    authorTelegramAccount
  );

  getHostName(appPort, selfUrl, ngRokToken)
    .then((host) => {
      logger.info(`Telling telegram our location is ${host}`);
      return bot.setHostLocation(host).applyHostLocation();
    })
    .then(() => server.setBots([bot]).start())
    .catch((err: Error) => logger.error(err));
}
