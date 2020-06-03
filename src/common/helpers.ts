import { Logger } from "../logger";
import { sleepFor } from "./timer";

const logger = new Logger("run-retry");

export function runPromiseWithRetry(
  fnName: string,
  fn: () => Promise<void>,
  timeoutMs = 0,
  tries = 5
): Promise<void> {
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
}
