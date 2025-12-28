import stripAnsi from "strip-ansi";
import { type LogType } from "./const.js";

const newrelic = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recordLogEvent: (..._opts: unknown[]): void => {
    // TODO mock
  },
};

export const sendLogs = (
  type: LogType,
  prefix: string,
  message: string,
  rawData: unknown,
): void => {
  newrelic.recordLogEvent({
    level: type,
    message: stripAnsi(`${prefix} ${message}`),
    error: rawData instanceof Error ? rawData : undefined,
  });
};
