import {
  durationLimitSec,
  secondsInOneMinute,
  supportedAudioFormats,
} from "../const.js";

export const getMaxDuration = (
  minutes: string,
  seconds: string,
  duration = durationLimitSec,
): string => {
  if (duration < secondsInOneMinute) {
    return `${duration} ${seconds}`;
  }
  const mins = Math.floor(duration / secondsInOneMinute);
  const secs = duration - mins * secondsInOneMinute;
  return secs ? `${mins} ${minutes} ${secs} ${seconds}` : `${mins} ${minutes}`;
};

export const getSupportedAudioFormats = (
  audioFormats = supportedAudioFormats,
): string => {
  const formats = audioFormats.reduce(
    (union, format) => union.add(format.ext.toLowerCase()),
    new Set<string>(),
  );

  return [...formats].map((format) => `*.${format}`).join(", ");
};

export const sSuffix = (word: string, count: number | boolean): string => {
  const isNumber = typeof count === "number";
  const isSingleChecker = isNumber ? count === 1 : !count;
  const suffix = isSingleChecker ? "" : "s";
  const prefix = !isNumber ? "" : `${count} `;
  return `${prefix}${word}${suffix}`;
};

export const toCurrency = (amount: number, meta?: string): string => {
  const amountStr = `${amount} €`;
  return meta ? `${amountStr}  ${meta}` : amountStr;
};
