import { Logger } from "../logger/index.js";
import { sleepFor } from "./timer.js";
import type { LanguageCode } from "../recognition/types.js";

const logger = new Logger("run-retry");

export const runPromiseWithRetry = <D>(
  fnName: string,
  fn: () => Promise<D>,
  timeoutMs = 0,
  tries = 5,
): Promise<D> => {
  if (!tries) {
    return Promise.reject(
      new Error(
        `Failed to execute function ${fnName} after 5 tries. Rejecting...`,
      ),
    );
  }
  return sleepFor(timeoutMs)
    .then(() => fn())
    .catch((err) => {
      logger.error(
        `Failed to execute function ${fnName}. Retrying in 10 sec...`,
        err,
      );
      return runPromiseWithRetry(fnName, fn, 10_000, tries - 1);
    });
};

export const flattenPromise = () => {
  // Flatten promise
};

export const splitTextIntoParts = (
  text: string,
  lang: LanguageCode,
  maxLength: number,
): string[] => {
  if (text.length <= maxLength) {
    return [text];
  }

  const segmenter = new Intl.Segmenter(lang, { granularity: "word" });
  const segments = segmenter.segment(text);

  const parts: string[] = [];

  let part = "";
  for (const { segment } of segments) {
    if (part.length + segment.length > maxLength) {
      parts.push(part.trim());
      part = "";
    }
    part = `${part}${segment}`;
  }

  part = part.trim();
  if (part) {
    parts.push(part);
  }

  return parts;
};

type RegExpFlag = "g" | "i";

export const getRegExpFromString = (
  str: string,
  flags: RegExpFlag[],
): RegExp => {
  const escaped = str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const regExpFlags = flags.join("");
  return new RegExp(escaped, regExpFlags || undefined);
};
