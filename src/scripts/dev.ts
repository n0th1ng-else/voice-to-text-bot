import * as envy from "../env";
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
import { StripePayment } from "../donate/stripe";
import { getLaunchDelay } from "./init";
import { printCurrentStorageUsage } from "../storage";
import { launchMonitoringAgent } from "../monitoring";

const logger = new Logger("dev-script");

export const run = (threadId = 0): void => {
  const launchDelay = getLaunchDelay(threadId);

  const server = new ExpressServer(
    envy.appPort,
    envy.enableSSL,
    envy.appVersion,
    httpsOptions
  );

  const converterOptions: VoiceConverterOptions = {
    googlePrivateKey: envy.googleApi.privateKey,
    googleProjectId: envy.googleApi.projectId,
    googleClientEmail: envy.googleApi.clientEmail,
    witAiTokenEn: envy.witAiApi.tokenEn,
    witAiTokenRu: envy.witAiApi.tokenRu,
  };

  const converter = getVoiceConverterInstance(
    getVoiceConverterProvider(envy.provider),
    converterOptions
  );

  const db = new DbClient({
    user: envy.dbPostgres.user,
    password: envy.dbPostgres.password,
    host: envy.dbPostgres.host,
    database: envy.dbPostgres.database,
    port: envy.dbPostgres.port,
  }).setClientName(threadId);

  const paymentProvider = new StripePayment(envy.stripeToken);

  const bot = new TelegramBotModel(
    envy.telegramBotApi,
    converter,
    db
  ).setAuthor(envy.authorTelegramAccount);

  const memoryDaemon = new ScheduleDaemon("memory", () =>
    printCurrentMemoryStat(envy.memoryLimit)
  ).start();
  const storageDaemon = new ScheduleDaemon("storage", () =>
    printCurrentStorageUsage("video-temp")
  ).start();
  const stopListener = new StopListener().addTrigger(() => {
    memoryDaemon.stop();
    storageDaemon.stop();
  });

  launchMonitoringAgent()
    .then(() => db.init())
    .then(() => getHostName(envy.appPort, envy.selfUrl, envy.ngRokToken))
    .then((host) => {
      logger.info(`Telling telegram our location is ${Logger.y(host)}`);
      bot.setHostLocation(host, envy.launchTime).setPayment(paymentProvider);

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
};
