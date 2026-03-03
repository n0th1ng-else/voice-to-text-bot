import newrelic from "newrelic";
import stripAnsi from "strip-ansi";
import { type LogType } from "./const.js";

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
