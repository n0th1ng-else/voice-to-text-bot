import newrelic from "newrelic";
import type { ChatType, VoiceType } from "../telegram/types.js";
import type { VoiceConverterProvider } from "../recognition/types.js";

const formatMetric = (metric: string): string => {
  // Snake_case to PascalCase
  return metric
    .split("_")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("");
};

export const trackProcessFile = (metric: "progress" | "failed"): void => {
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
): void => {
  const metricName = `VoiceRecognitionProviders/${formatMetric(metric)}/RecognitionTimeMs`;
  newrelic.recordMetric(metricName, durationMSec);
};

export const trackApplicationErrors = () => {
  newrelic.incrementMetric(`ApplicationHealth/Error`);
};
