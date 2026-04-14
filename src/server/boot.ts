import * as envy from "../env.js";
import { BotServer } from "./bot-server.js";
import { httpsOptions } from "../../certs/index.js";
import { getVoiceConverterInstances, getVoiceProviders } from "../recognition/index.js";
import { getDb } from "../db/index.js";
import { StripePayment } from "../donate/stripe.js";
import { TelegramBotModel } from "../telegram/bot.js";
import { StopListener } from "../process/index.js";
import { getHostName } from "./tunnel.js";
import { Logger } from "../logger/index.js";
import { isDBConfigValid } from "../db/utils.js";
import { parseMultilineEnvVariable } from "../common/environment.js";
import type { BotServerModel } from "./types.js";
import { trackApplicationErrors } from "../monitoring/newrelic.js";
import { getRuntimeEngineType } from "../engines/index.js";
import { prepareSentryInstance } from "../monitoring/sentry/index.js";
import { initMemoryDaemon } from "../scheduler/memory.js";
import { initStorageDaemon } from "../scheduler/storage.js";
import { initHealthDaemon } from "../scheduler/health.js";
import { initNodeDaemon } from "../scheduler/node.js";

const logger = new Logger("boot-server");

export const prepareInstance = async (threadId: number): Promise<BotServerModel> => {
  const engine = getRuntimeEngineType();
  logger.info(`The ${Logger.y(engine.engine)} server is starting...`);
  trackApplicationErrors("Launch");

  await prepareSentryInstance();

  const sslOptions = envy.enableSSL ? httpsOptions : undefined;
  const server = new BotServer(
    envy.appPort,
    envy.appVersion,
    envy.webhookDoNotWait,
    sslOptions,
    envy.enableSnapshotCapture,
  );

  const providers = getVoiceProviders(envy.providers);
  const converters = await getVoiceConverterInstances(providers.main, providers.advanced, envy);

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

  const bot = await TelegramBotModel.factory(
    envy.telegramBotApi,
    envy.telegramBotAppId,
    envy.telegramBotAppHash,
    envy.useMTProto,
    converters,
    db,
  );

  bot.setAuthor(envy.authorTelegramAccount);

  return db
    .init()
    .then(() => getHostName(envy.appPort, envy.selfUrl, envy.enableSSL, envy.ngRokToken))
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
        .setRuntimeVersion(engine.engine, engine.version);
    });
};

export const prepareStopListener = async (server: BotServerModel): Promise<StopListener> => {
  const selfUrl = await getHostName(envy.appPort, envy.selfUrl, envy.enableSSL, envy.ngRokToken);

  const memoryDaemon = initMemoryDaemon(envy.appVersion, envy.memoryLimit).start();

  const storageDaemon = initStorageDaemon(envy.appVersion).start();

  const healthDaemon = initHealthDaemon(selfUrl).start();

  const nodeDaemon = initNodeDaemon(selfUrl, server).start();

  const stopListener = new StopListener().addTrigger(() => {
    memoryDaemon.stop();
    storageDaemon.stop();
    healthDaemon.stop();
    nodeDaemon.stop();
  });

  return stopListener;
};
