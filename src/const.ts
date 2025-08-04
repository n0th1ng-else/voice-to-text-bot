import type {
  ConverterType,
  VoiceConverterProvider,
} from "./recognition/types.js";
import type { PaymentChargeId } from "./telegram/api/core.js";

const GITHUB_PROJECT = "https://github.com/n0th1ng-else/voice-to-text-bot";

export const githubUrl = `${GITHUB_PROJECT}/issues`;

export const localhostUrl = "http://localhost";

export const officialChannelAccount = "https://t.me/AudioMessBotNews";

export const BOT_LOGO = `${GITHUB_PROJECT}/raw/master/assets/v2/botPic.png`;

export const wavSampleRate = 16_000; // 16kHz

export const secondsInOneMinute = 60;

export const durationLimitSec = 90;

export const subscriptionDurationSeconds = 2_592_000; // 30d * 24h * 60m * 60s

export const subscriptionTrialDurationSeconds = 604_800; // 7d * 24h * 60m * 60s

export const subscriptionTrialPaymentId = "trial-no-payment" as PaymentChargeId;

export const subscriptionPrice = 150; // 150 Stars

export const API_TIMEOUT_MS = 10_000;

export const supportedAudioFormats = [
  {
    mimeType: "audio/ogg",
    ext: "ogg",
  },
  {
    mimeType: "audio/opus",
    ext: "opus",
  },
  {
    mimeType: "audio/x-opus+ogg",
    ext: "ogg",
  },
  {
    mimeType: "audio/mpeg",
    ext: "m4a",
  },
];

export const donationLevels = {
  stars: [
    {
      amount: 100,
      meta: "⭐",
    },
    {
      amount: 150,
      meta: "⭐⭐",
    },
    {
      amount: 250,
      meta: "⭐⭐⭐",
    },
  ],
  euros: [
    {
      amount: 3,
      meta: "🚀",
    },
    {
      amount: 5,
      meta: "😎",
    },
    {
      amount: 7,
      meta: "👑",
    },
  ],
};

export const VOICE_PROVIDERS: Record<ConverterType, VoiceConverterProvider> = {
  main: "WITAI",
  advanced: "11LABS",
};
