import {
  appPort,
  enableSSL,
  googleApi,
  provider,
  selfUrl,
  telegramBotApi,
  ngRokToken,
  authorTelegramAccount,
  appVersion,
  launchTime,
  memoryLimit,
  dbPostgres,
  roboKassa,
} from "../env";
import { Logger } from "../logger";
import { VoiceConverterOptions } from "../recognition/types";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../recognition";
import { getHostName } from "../server/tunnel";
import { TelegramBotModel } from "../telegram/bot";
import { ExpressServer } from "../server/express";
import { StopListener } from "../process";
import { httpsOptions } from "../../certs";
import { ScheduleDaemon } from "../scheduler";
import { printCurrentMemoryStat } from "../memory";
import { DbClient } from "../db";
import { RobokassaPayment } from "../donate/robokassa";

const logger = new Logger("dev-script");

export function run(threadId = 0): void {
  const launchDelay = threadId ? (threadId - 1) * 10_000 : 0;

  const server = new ExpressServer(
    appPort,
    enableSSL,
    appVersion,
    httpsOptions
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

  const db = new DbClient({
    user: dbPostgres.user,
    password: dbPostgres.password,
    host: dbPostgres.host,
    database: dbPostgres.database,
    port: dbPostgres.port,
  }).setClientName(threadId);

  const roboPayment = new RobokassaPayment(
    roboKassa.login,
    roboKassa.passwordForSend,
    roboKassa.enableTest
  );

  const bot = new TelegramBotModel(telegramBotApi, converter, db).setAuthor(
    authorTelegramAccount
  );

  const daemon = new ScheduleDaemon("memory", () =>
    printCurrentMemoryStat(memoryLimit)
  ).start();
  const stopListener = new StopListener().addTrigger(() => daemon.stop());

  db.init()
    .then(() => getHostName(appPort, selfUrl, ngRokToken))
    .then((host) => {
      logger.info(`Telling telegram our location is ${Logger.y(host)}`);
      bot.setHostLocation(host, launchTime).setPayment(roboPayment);

      return server
        .setSelfUrl(host)
        .setBots([bot])
        .setStat(db)
        .setThreadId(threadId)
        .applyHostLocation(launchDelay);
    })
    .then(() => server.start())
    .then((onStop) => stopListener.addTrigger(() => onStop()))
    .catch((err) => logger.error("Failed to run dev instance", err));
}
