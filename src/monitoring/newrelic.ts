import newrelic from "newrelic";
import type { FastifyInstance } from "fastify";
import type { ChatType, VoiceType } from "../telegram/types.js";
import type { VoiceConverterProvider } from "../recognition/types.js";
import type { Currency } from "../telegram/api/groups/payments/payments-types.js";
import { setFastifyPreHandler } from "../server/hook.js";

const formatMetric = (metric: string): string => {
  // Snake_case to PascalCase
  return metric
    .split("_")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("");
};

export const trackProcessFile = (metric: "progress" | "failed" | "success"): void => {
  newrelic.incrementMetric(`FileProcessing/${formatMetric(metric)}`);
};

export const trackVoiceDuration = (
  category: VoiceType,
  metric: ChatType,
  durationSec: number,
): void => {
  const metricName = `VoiceFiles/${formatMetric(category)}/${formatMetric(metric)}`;
  newrelic.recordMetric(metricName, durationSec);
};

export const trackRecognitionTime = (
  metric: VoiceConverterProvider,
  durationMSec: number,
  voiceLengthSec: number,
): number => {
  const metricNameDuration = `VoiceRecognitionProviders/${formatMetric(metric)}/RecognitionTimeMs`;
  newrelic.recordMetric(metricNameDuration, durationMSec);

  if (!voiceLengthSec) {
    return 0;
  }

  const ratioPerSec = Math.ceil(durationMSec / voiceLengthSec);
  const metricNameRatio = `VoiceRecognitionProviders/${formatMetric(metric)}/RecognitionTimePerSecondMs`;
  newrelic.recordMetric(metricNameRatio, ratioPerSec);
  return ratioPerSec;
};

export const trackFullRecognitionTime = (durationMSec: number): void => {
  const metricName = "VoiceRecognition/RecognitionTimeMs";
  newrelic.recordMetric(metricName, durationMSec);
};

export const trackApplicationErrors = (type: "error" | "warning" | "launch"): void => {
  newrelic.incrementMetric(`ApplicationHealth/${formatMetric(type)}`);
};

export const trackApplicationHealth = (status: "ok" | "error"): void => {
  newrelic.recordCustomEvent("ApplicationHealth", {
    status,
  });
};

export const trackRecognitionProviderHealth = (provider: string, status: "ok" | "error"): void => {
  newrelic.recordCustomEvent("RecognitionProviderHealth", {
    provider,
    status,
  });
};

type UserActivityData = {
  activityType: "voice" | "lang" | "start" | "donate" | "support";
};
export const trackUserActivity = (data: UserActivityData, userId?: number): void => {
  newrelic.recordCustomEvent("UserActivity", {
    userId: userId ? String(userId) : "unknownId",
    ...data,
  });
};

export const trackMimeType = (type: string, isSupported: boolean): void => {
  newrelic.recordCustomEvent("FileMimeType", {
    type,
    isSupported,
  });
};

export const trackRawUserLanguage = (rawLanguage: string): void => {
  newrelic.recordCustomEvent("UserMessageLanguage", {
    rawLanguage,
  });
};

type DonationActivityData = {
  activityType: "start" | "success";
  currency: Currency;
  amount: number;
};
export const trackDonation = (data: DonationActivityData, userId?: number): void => {
  newrelic.recordCustomEvent("DonationActivity", {
    userId: userId ? String(userId) : "unknownId",
    ...data,
  });
};

export const trackUnknownRoute = (route: string): void => {
  newrelic.recordCustomEvent("UnknownRoute", {
    route,
  });
};

export const trackFileDownload = (type: "api" | "mtproto"): void => {
  newrelic.incrementMetric(`FileDownloadType/${formatMetric(type)}`);
};

export const initNewRelicRequestContext = (app: FastifyInstance): void => {
  setFastifyPreHandler(app, (meta, done) => {
    if (meta.userId) {
      newrelic.setUserID(String(meta.userId));
      newrelic.addCustomAttributes({
        "tg.chatId": meta.chatId || "n/a",
        "tg.userId": meta.userId || "n/a",
        "tg.userLanguage": meta.lang || "n/a",
      });
    }

    done();
  });
};
