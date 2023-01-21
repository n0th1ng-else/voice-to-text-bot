import * as envy from "../env";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../recognition";
import { VoiceConverterOptions } from "../recognition/types";
import { Logger } from "../logger";
import { TelegramBotModel } from "../telegram/bot";
import { ExpressServer } from "../server/express";
import { getHostName } from "../server/tunnel";
import { ScheduleDaemon } from "../scheduler";
import { printCurrentMemoryStat } from "../memory";
import { StopListener } from "../process";
import { httpsOptions } from "../../certs";
import { DbClient } from "../db";
import { StripePayment } from "../donate/stripe";
import { getLaunchDelay } from "./init";
import { printCurrentStorageUsage } from "../storage";
import { launchMonitoringAgent } from "../monitoring";

const logger = new Logger("start-script");

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

  launchMonitoringAgent(
    envy.monitoring.region,
    envy.monitoring.token,
    envy.monitoring.infra
  )
    .then(() => db.init())
    .then(() => getHostName(envy.appPort, envy.selfUrl, envy.ngRokToken))
    .then((host) => {
      logger.info(
        `Telling telegram our location is ${Logger.y(
          host
        )}. Launched at ${Logger.y(envy.launchTime)}`
      );
      bot.setHostLocation(host, envy.launchTime).setPayment(paymentProvider);
      return server
        .setSelfUrl(host)
        .setBots([bot])
        .setStat(db)
        .setThreadId(threadId)
        .start();
    })
    .then((stopFn) => {
      stopListener.addTrigger(() => stopFn());
      return server.triggerDaemon(
        envy.nextReplicaUrl,
        envy.replicaLifecycleInterval,
        launchDelay
      );
    })
    .catch((err) => logger.error("Failed to run the server", err));
};
