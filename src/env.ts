import type { LanguageTokens } from "./recognition/types.js";

export const appPort: number = Number(process.env.PORT) || 3000;

export const appVersion: string = process.env.APP_VERSION || "dev";

export const enableSSL = process.env.ENABLE_SSL === "true";

export const selfUrl: string = process.env.SELF_URL || "";

export const nextReplicaUrl: string = process.env.NEXT_REPLICA_URL || "";

export const replicaLifecycleInterval: number =
  Number(process.env.REPLICA_LIFECYCLE_INTERVAL_DAYS) || 1;

export const telegramBotApi: string = process.env.TELEGRAM_BOT_API || "";
export const telegramBotAppId: number =
  Number(process.env.TELEGRAM_APP_ID) || 0;
export const telegramBotAppHash: string = process.env.TELEGRAM_APP_HASH || "";

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

export const memoryLimit = Number(process.env.MEMORY_LIMIT_MB) || 0;

export const clusterSize = Number(process.env.CLUSTER_SIZE) || 2;

export const launchTime =
  Number(process.env.LAUNCH_TIME) || new Date().getTime();

export const dbPostgres = {
  user: process.env.DB_USER || "",
  password: process.env.DB_PASSWORD || "",
  host: process.env.DB_HOST || "",
  database: process.env.DB_DATABASE || "",
  port: Number(process.env.DB_PORT) || 5432,
  cert: process.env.DB_CERT || "",
};

export const dbPostgres2 = {
  user: process.env.DB_USER_2 || "",
  password: process.env.DB_PASSWORD_2 || "",
  host: process.env.DB_HOST_2 || "",
  database: process.env.DB_DATABASE_2 || "",
  port: Number(process.env.DB_PORT_2) || 5432,
  cert: process.env.DB_CERT_2 || "",
};

export const analytics = {
  apiSecret: process.env.GA_V4_SECRET || "",
  measurementId: process.env.GA_V4_MEASUREMENT_ID || "",
};

export const witAiApi: { tokens: LanguageTokens } = {
  tokens: {
    "en-US": process.env.WIT_AI_TOKEN_EN || "",
    "ru-RU": process.env.WIT_AI_TOKEN_RU || "",
  },
};

export const wtiAiTokens = process.env.WIT_AI_TOKENS || "";

export const isDebug = process.env.DEBUG === "true";

export const stripeToken = process.env.STRIPE_TOKEN || "";

export const amplitudeToken = process.env.AMPLITUDE_TOKEN || "";

export const nodeEnvironment = process.env.NODE_ENV || "production";

export const sentryDsn = process.env.SENTRY_DSN || "";

export const logLevel = process.env.LOG_LEVEL || "";

export const webhookDoNotWait = process.env.WEBHOOK_DO_NOT_WAIT === "true";

export const whisperModelFile = process.env.WHISPER_MODEL_FILE || "";

export const whisperEnableGpu = process.env.WHISPER_GPU === "true";

export const nodeVersion = process.versions.node;

export const elevenLabsKey = process.env.ELEVENLABS_API_KEY || "";

export const grafana = {
  host: process.env.GRAFANA_HOST || "",
  token: process.env.GRAFANA_TOKEN || "",
};
