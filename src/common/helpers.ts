import { Logger } from "../logger";
import { sleepFor } from "./timer";

const logger = new Logger("run-retry");

export const runPromiseWithRetry = <D>(
  fnName: string,
  fn: () => Promise<D>,
  timeoutMs = 0,
  tries = 5
): Promise<D> => {
  if (!tries) {
    return Promise.reject(
      new Error(
        `Failed to execute function ${fnName} after 5 tries. Rejecting...`
      )
    );
  }
  return sleepFor(timeoutMs)
    .then(() => fn())
    .catch((err) => {
      logger.error(
        `Failed to execute function ${fnName}. Retrying in 10 sec...`,
        err
      );
      return runPromiseWithRetry(fnName, fn, 10_000, tries - 1);
    });
};

export const flattenPromise = () => {
  // Flatten promise
};
