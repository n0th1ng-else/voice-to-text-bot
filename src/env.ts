import { VoiceConverterProvider } from "./recognition/types";

export const appPort: number = Number(process.env.PORT) || 3000;

export const enableSSL = process.env.ENABLE_SSL === "true";

export const provider: string =
  process.env.PROVIDER || VoiceConverterProvider.Google;

export const selfUrl: string = process.env.SELF_URL || "";

export const replicaCount: number = Number(process.env.REPLICA_COUNT) || 1;

export const replicaIndex: number = Number(process.env.REPLICA_INDEX) || 0;

export const telegramBotApi: string = process.env.TELEGRAM_BOT_API || "";

export const ngRokToken: string = process.env.NGROK_TOKEN || "";

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
