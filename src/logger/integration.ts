import winston from "winston";
import { Loggly } from "winston-loggly-bulk";
import { selfUrl, logApi } from "../env";

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
    ? data.reduce<LogDataType>((res, prop, index) => {
        res[index] = prop;
        return res;
      }, {})
    : data;

  winston[type]({
    level: type,
    message,
    id,
    ...logData,
  });
}
