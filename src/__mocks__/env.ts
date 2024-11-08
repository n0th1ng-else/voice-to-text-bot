import { randomIntFromInterval } from "../common/timer.js";

export const appPort = 3000;

export const appVersion = `BotVersion-${randomIntFromInterval(1, 10000)}`;

export const enableSSL = false;

export const provider = "WITAI";

export const selfUrl = "https://localhost";

export const nextReplicaUrl = "";

export const replicaLifecycleInterval = 1;

export const telegramBotApi = "";

export const telegramBotName = `BotName-${randomIntFromInterval(1, 100)}`;

export const ngRokToken = "";

export const authorTelegramAccount = "";

export const cacheSize = 0;

export const googleApi = {
  projectId: "",
  clientEmail: "",
  privateKey: "",
};

export const logApiTokenV2 = "";

export const memoryLimit = 0;

export const clusterSize = 2;

export const launchTime = new Date().getTime();

export const dbPostgres = {
  user: "",
  password: "",
  host: "",
  database: "",
  port: 5432,
  cert: "",
};

export const dbPostgres2 = {
  user: "",
  password: "",
  host: "",
  database: "",
  port: 5432,
  cert: "",
};

export const analytics = {
  apiSecret: `v4-secret-${randomIntFromInterval(1, 1000)}`,
  measurementId: `v4-${randomIntFromInterval(1, 1000)}`,
};

export const witAiApi = {
  tokens: {
    "en-US": "",
    "ru-RU": "",
  },
};

export const isDebug = false;

export const stripeToken = "";

export const amplitudeToken = "";

export const nodeEnvironment = "production";

export const sentryDsn = "";

export const logLevel = "debug";

export const webhookDoNotWait = false;

export const newRouter = false;

export const whisperModelFile = "";

export const whisperEnableGpu = false;
