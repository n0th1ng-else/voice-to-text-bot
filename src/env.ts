import { VoiceConverterProvider } from "./recognition/types";

process.env.NTBA_FIX_319 = "true"; // Disable some weird logic from "node-telegram-bot-api" package

export const appPort: number = Number(process.env.PORT) || 3000;

export const appVersion: string = process.env.APP_VERSION || "dev";

export const enableSSL = process.env.ENABLE_SSL === "true";

export const provider: string =
  process.env.PROVIDER || VoiceConverterProvider.Google;

export const selfUrl: string = process.env.SELF_URL || "";

export const nextReplicaUrl: string = process.env.NEXT_REPLICA_URL || "";

export const replicaLifecycleInterval: number =
  Number(process.env.REPLICA_LIFECYCLE_INTERVAL_DAYS) || 1;

export const telegramBotApi: string = process.env.TELEGRAM_BOT_API || "";

export const telegramBotName: string = process.env.TELEGRAM_BOT_NAME || "";

export const ngRokToken: string = process.env.NGROK_TOKEN || "";

export const authorTelegramAccount: string =
  process.env.AUTHOR_TELEGRAM_ACCOUNT || "";

export const cacheSize: number = Number(process.env.CACHE_SIZE) || 0;

export const googleApi = {
  projectId: process.env.GOOGLE_PROJECT_ID || "",
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL || "",
  privateKey: process.env.GOOGLE_PRIVATE_KEY || "",
};

export const dbStat = {
  statUrl: process.env.DB_STAT_URL || "",
  appId: process.env.DB_STAT_APP_ID || "",
  appKey: process.env.DB_STAT_APP_KEY || "",
  masterKey: process.env.DB_STAT_MASTER_KEY || "",
};

export const logApi = {
  apiToken: process.env.LOG_API_TOKEN || "",
  projectId: process.env.LOG_PROJECT_ID || "",
};

export const memoryLimit = Number(process.env.MEMORY_LIMIT_MB) || 0;

export const clusterSize = Number(process.env.CLUSTER_SIZE) || 1;

export const launchTime =
  Number(process.env.LAUNCH_TIME) || new Date().getTime();

export const dbPostgres = {
  user: process.env.DB_USER || "",
  password: process.env.DB_PASSWORD || "",
  host: process.env.DB_HOST || "",
  database: process.env.DB_DATABASE || "",
  port: Number(process.env.DB_PORT) || 5432,
};

export const analyticsId = process.env.GA_TRACKING_ID || "";
