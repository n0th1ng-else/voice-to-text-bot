import * as envy from "../env.js";
import { BotServer } from "./bot-server.js";
import { httpsOptions } from "../../certs/index.js";
import { getVoiceConverterInstances } from "../recognition/index.js";
import { getDb } from "../db/index.js";
import { StripePayment } from "../donate/stripe.js";
import { TelegramBotModel } from "../telegram/bot.js";
import { ScheduleDaemon } from "../scheduler/index.js";
import { printCurrentMemoryStat, sendMemoryStatAnalytics } from "../memory/index.js";
import { printCurrentStorageUsage, sendStorageStatAnalytics } from "../storage/index.js";
import { StopListener } from "../process/index.js";
import { getHostName } from "./tunnel.js";
import { Logger } from "../logger/index.js";
import { isDBConfigValid } from "../db/utils.js";
import { parseMultilineEnvVariable } from "../common/environment.js";
import { type BotServerModel, HealthStatus } from "./types.js";
import { VOICE_PROVIDERS } from "../const.js";
import { trackApplicationErrors, trackApplicationHealth } from "../monitoring/newrelic.js";
import { requestHealthData } from "./api.js";

const logger = new Logger("boot-server");

export const prepareInstance = async (threadId: number): Promise<BotServerModel> => {
  logger.info("The server is starting...");
  trackApplicationErrors("Launch");
  const sslOptions = envy.enableSSL ? httpsOptions : undefined;
  const server = new BotServer(
    envy.appPort,
    envy.appVersion,
    envy.webhookDoNotWait,
    sslOptions,
    envy.enableSnapshotCapture,
  );

  const converters = await getVoiceConverterInstances(
    VOICE_PROVIDERS.main,
    VOICE_PROVIDERS.advanced,
    envy,
  );

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
        .setNodeVersion(envy.nodeVersion);
    });
};

export const prepareStopListener = async (): Promise<StopListener> => {
  const selfUrl = await getHostName(envy.appPort, envy.selfUrl, envy.enableSSL, envy.ngRokToken);

  const memoryDaemon = new ScheduleDaemon("memory", async () => {
    const value = await printCurrentMemoryStat(envy.memoryLimit);
    await sendMemoryStatAnalytics(value, envy.appVersion);
  }).start();
  const storageDaemon = new ScheduleDaemon("storage", async () => {
    const value = await printCurrentStorageUsage("file-temp");
    await sendStorageStatAnalytics(value, envy.appVersion);
  }).start();
  const healthDaemon = new ScheduleDaemon(
    "health",
    async () => {
      try {
        const value = await requestHealthData(selfUrl);
        const status = value.status === HealthStatus.Online ? "UP" : "DOWN";
        trackApplicationHealth(status);
      } catch (err) {
        trackApplicationHealth("DOWN");
        throw err;
      }
    },
    {
      skipInitialTick: true,
    },
  ).start();

  const stopListener = new StopListener().addTrigger(() => {
    memoryDaemon.stop();
    storageDaemon.stop();
    healthDaemon.stop();
  });

  return stopListener;
};
