import winston from "winston";
import stripAnsi from "strip-ansi";
import { Loggly } from "winston-loggly-bulk";
import { selfUrl, logApi, appVersion } from "../env";

export enum LogType {
  Info = "info",
  Warn = "warn",
  Error = "error",
}

function isLoggingEnabled(): boolean {
  return !!(logApi.apiToken && logApi.projectId);
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
const convertDataItem = (data: any, ind: number): Record<string, string> => {
  const recordKey = `metadata-${ind}`;

  if (typeof data === "string") {
    return {
      [`${recordKey}-0`]: stripAnsi(data),
    };
  }

  if (typeof data === "boolean" || typeof data === "number") {
    return {
      [`${recordKey}-0`]: String(data),
    };
  }

  if (Array.isArray(data)) {
    return data.reduce((res, item, index) => {
      res[`${recordKey}-${index}`] = item;
      return res;
    }, {});
  }

  return Object.keys(data).reduce((res, key) => {
    res[`${recordKey}-${key}`] = data[key];
    return res;
  }, {});
};

if (isLoggingEnabled()) {
  const plainHost = selfUrl
    ? selfUrl.replace(/https?:\/\//, "").replace(/\./g, "-")
    : "localhost";

  winston.add(
    new Loggly({
      token: logApi.apiToken,
      subdomain: logApi.projectId,
      tags: [`app.${appVersion}`, `host.${plainHost}`],
      json: true,
    })
  );
}

export function sendLogs(
  type: LogType,
  id: string,
  prefix: string,
  message: string,
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  data: any[] = []
): void {
  if (!isLoggingEnabled()) {
    return;
  }

  const logData = Array.isArray(data)
    ? data.reduce((res, prop, index) => {
        const itemData = convertDataItem(prop, index);
        res = {
          ...res,
          ...itemData,
        };
        return res;
      }, {})
    : data;

  winston[type]({
    level: type,
    message: stripAnsi(message),
    id,
    prefix: prefix || "no",
    ...logData,
  });
}
