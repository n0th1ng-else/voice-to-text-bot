import { durationLimitSec, secondsInOneMinute, supportedAudioFormats } from "../const.js";

export const getMaxDuration = (duration = durationLimitSec): [number, number] => {
  const mins = Math.floor(duration / secondsInOneMinute);
  const secs = duration - mins * secondsInOneMinute;
  return [mins, secs];
};

export const getSupportedAudioFormats = (audioFormats = supportedAudioFormats): string => {
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
  const prefix = isNumber ? `${count} ` : "";
  return `${prefix}${word}${suffix}`;
};

export const toCurrency = (amount: number, meta?: string): string => {
  const amountStr = `${amount}€`;
  return meta ? `${amountStr}  ${meta}` : amountStr;
};
