import * as envy from "../env.js";
import { BotServer } from "./bot-server.js";
import { httpsOptions } from "../../certs/index.js";
import type { VoiceConverterOptions } from "../recognition/types.js";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../recognition/index.js";
import { getDb } from "../db/index.js";
import { StripePayment } from "../donate/stripe.js";
import { TelegramBotModel } from "../telegram/bot.js";
import { ScheduleDaemon } from "../scheduler/index.js";
import { printCurrentMemoryStat } from "../memory/index.js";
import { printCurrentStorageUsage } from "../storage/index.js";
import { StopListener } from "../process/index.js";
import { getHostName } from "./tunnel.js";
import { Logger } from "../logger/index.js";
import { isDBConfigValid } from "../db/utils.js";

const logger = new Logger("boot-server");

export const prepareInstance = (threadId: number): Promise<BotServer> => {
  const server = new BotServer(
    envy.appPort,
    envy.enableSSL,
    envy.appVersion,
    envy.webhookDoNotWait,
    httpsOptions,
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
    converterOptions,
  );

  const db = getDb(
    [
      {
        user: envy.dbPostgres.user,
        password: envy.dbPostgres.password,
        host: envy.dbPostgres.host,
        database: envy.dbPostgres.database,
        port: envy.dbPostgres.port,
        certificate: envy.dbPostgres.cert,
      },
      {
        user: envy.dbPostgres2.user,
        password: envy.dbPostgres2.password,
        host: envy.dbPostgres2.host,
        database: envy.dbPostgres2.database,
        port: envy.dbPostgres2.port,
        certificate: envy.dbPostgres2.cert,
      },
    ].filter((cfg) => isDBConfigValid(cfg)),
    threadId,
  );

  const paymentProvider = new StripePayment(envy.stripeToken);

  const bot = new TelegramBotModel(
    envy.telegramBotApi,
    converter,
    db,
  ).setAuthor(envy.authorTelegramAccount);

  return db
    .init()
    .then(() =>
      getHostName(envy.appPort, envy.selfUrl, envy.enableSSL, envy.ngRokToken),
    )
    .then((host) => {
      logger.info(
        `Telling telegram our location is ${Logger.y(
          host,
        )}. Launched at ${Logger.y(envy.launchTime)}`,
      );

      bot.setHostLocation(host, envy.launchTime).setPayment(paymentProvider);
      return server
        .setSelfUrl(host)
        .setBots([bot])
        .setStat(db)
        .setThreadId(threadId);
    });
};

export const prepareStopListener = (): StopListener => {
  const memoryDaemon = new ScheduleDaemon("memory", () =>
    printCurrentMemoryStat(envy.memoryLimit),
  ).start();
  const storageDaemon = new ScheduleDaemon("storage", () =>
    printCurrentStorageUsage("video-temp"),
  ).start();

  const stopListener = new StopListener().addTrigger(() => {
    memoryDaemon.stop();
    storageDaemon.stop();
  });

  return stopListener;
};
