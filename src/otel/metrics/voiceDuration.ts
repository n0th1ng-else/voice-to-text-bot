import { metrics, trace } from "@opentelemetry/api";
import { appVersion } from "../../env.js";
import { isLocal } from "../utils.js";

export type DurationMetric = (durationSec: number) => void;

export const getDurationMetricRecorder = (): DurationMetric => {
  const meter = metrics.getMeter("vtt-core", appVersion);

  const audioDurationHistogram = meter.createHistogram(
    "app.audio.file.duration",
    {
      description: "Duration of processed audio files",
      unit: "s",
    },
  );

  return (durationSec: number): void => {
    audioDurationHistogram.record(durationSec, {
      environment: isLocal() ? "local" : "production",
    });

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttribute("audio.file.duration_s", durationSec);
    }
  };
};
