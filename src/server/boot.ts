import * as envy from "../env.js";
import { BotServer } from "./bot-server.js";
import { BotServerNew } from "./bot-server-new.js";
import { httpsOptions } from "../../certs/index.js";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../recognition/index.js";
import { getDb } from "../db/index.js";
import { StripePayment } from "../donate/stripe.js";
import { TelegramBotModel } from "../telegram/bot.js";
import { ScheduleDaemon } from "../scheduler/index.js";
import {
  printCurrentMemoryStat,
  sendMemoryStatAnalytics,
} from "../memory/index.js";
import {
  printCurrentStorageUsage,
  sendStorageStatAnalytics,
} from "../storage/index.js";
import { StopListener } from "../process/index.js";
import { getHostName } from "./tunnel.js";
import { Logger } from "../logger/index.js";
import { isDBConfigValid } from "../db/utils.js";
import { parseMultilineEnvVariable } from "../common/environment.js";
import type { BotServerModel } from "./types.js";

const logger = new Logger("boot-server");

export const prepareInstance = async (
  threadId: number,
): Promise<BotServerModel> => {
  const sslOptions = envy.enableSSL ? httpsOptions : undefined;
  const server = envy.newRouter
    ? new BotServerNew(
        envy.appPort,
        envy.appVersion,
        envy.webhookDoNotWait,
        sslOptions,
      )
    : new BotServer(
        envy.appPort,
        envy.appVersion,
        envy.webhookDoNotWait,
        sslOptions,
      );

  const parsedProvider = getVoiceConverterProvider(envy.provider);

  const converter = await getVoiceConverterInstance(parsedProvider, envy);

  const db = getDb(
    [
      {
        user: envy.dbPostgres.user,
        password: envy.dbPostgres.password,
        host: envy.dbPostgres.host,
        database: envy.dbPostgres.database,
        port: envy.dbPostgres.port,
        certificate: parseMultilineEnvVariable(envy.dbPostgres.cert),
      },
      {
        user: envy.dbPostgres2.user,
        password: envy.dbPostgres2.password,
        host: envy.dbPostgres2.host,
        database: envy.dbPostgres2.database,
        port: envy.dbPostgres2.port,
        certificate: parseMultilineEnvVariable(envy.dbPostgres2.cert),
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
        .setThreadId(threadId)
        .setNodeVersion(envy.nodeVersion);
    });
};

export const prepareStopListener = (): StopListener => {
  const memoryDaemon = new ScheduleDaemon("memory", async () => {
    const value = await printCurrentMemoryStat(envy.memoryLimit);
    await sendMemoryStatAnalytics(value, envy.appVersion);
  }).start();
  const storageDaemon = new ScheduleDaemon("storage", async () => {
    const value = await printCurrentStorageUsage("file-temp");
    await sendStorageStatAnalytics(value, envy.appVersion);
  }).start();

  const stopListener = new StopListener().addTrigger(() => {
    memoryDaemon.stop();
    storageDaemon.stop();
  });

  return stopListener;
};
