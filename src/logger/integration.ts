import winston from "winston";
import stripAnsi from "strip-ansi";
import { Loggly } from "winston-loggly-bulk";
import { selfUrl, logApi, appVersion } from "../env";

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
type LogDataType = Record<string, any>;

export enum LogType {
  Info = "info",
  Warn = "warn",
  Error = "error",
}

function isLoggingEnabled(): boolean {
  return !!(logApi.apiToken && logApi.projectId);
}

if (isLoggingEnabled()) {
  winston.add(
    new Loggly({
      token: logApi.apiToken,
      subdomain: logApi.projectId,
      tags: [
        "bot",
        "server",
        appVersion,
        selfUrl.replace(/https?:\/\//, "").replace(/\./g, "-") || "local",
      ],
      json: true,
    })
  );
}

export function sendLogs(
  type: LogType,
  id: string,
  message: string,
  data: LogDataType | LogDataType[] = {}
): void {
  if (!isLoggingEnabled()) {
    return;
  }

  const logData = Array.isArray(data)
    ? data.reduce((res, prop, index) => {
        const val = typeof prop === "string" ? stripAnsi(prop) : prop;
        res[`metadata-${index}`] = val;
        return res;
      }, {})
    : data;

  winston[type]({
    level: type,
    message: stripAnsi(message),
    id,
    ...logData,
  });
}
