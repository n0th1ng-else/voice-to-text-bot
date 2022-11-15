import { createLogger, format, transports } from "winston";
import stripAnsi from "strip-ansi";
import { Loggly } from "winston-loggly-bulk";
import Logsene from "winston-logsene";
import axios from "axios";
import { selfUrl, logApi, logApiTokenV2, appVersion, isDebug } from "../env";

export enum LogType {
  Info = "info",
  Warn = "warn",
  Error = "error",
}

const isLoggingEnabled = (): boolean =>
  Boolean(logApi.apiToken && logApi.projectId);

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

  if (data === null || data === undefined) {
    return {
      [`${recordKey}-0`]: data,
    };
  }

  if (Array.isArray(data)) {
    return data.reduce((res, item, index) => {
      res[`${recordKey}-${index}`] = item;
      return res;
    }, {});
  }

  return Object.getOwnPropertyNames(data).reduce((res, key) => {
    res[`${recordKey}-${key}`] = data[key];
    return res;
  }, {});
};

const plainHost = selfUrl
  ? selfUrl.replace(/https?:\/\//, "").replace(/\./g, "-")
  : "localhost";

const logTags = [`app.${appVersion}`, `host.${plainHost}`];

const logglyTransport = [
  isLoggingEnabled() &&
    new Loggly({
      token: logApi.apiToken,
      subdomain: logApi.projectId,
      tags: logTags,
      json: true,
    }),
  logApiTokenV2 &&
    new Logsene({
      token: logApiTokenV2,
      level: "info",
      type: "application-logs",
      url: "https://logsene-receiver.eu.sematext.com/_bulk",
    }),
].filter(Boolean);

const { combine, json, errors } = format;
const bulkLogger = createLogger({
  format: combine(errors({ stack: true }), json()),
  transports: isDebug
    ? [new transports.Console(), ...logglyTransport]
    : logglyTransport,
});

export const sendLogs = (
  type: LogType,
  id: string,
  prefix: string,
  message: string,
  rawData: unknown
): void => {
  if (!logglyTransport.length) {
    return;
  }
  const data = axios.isAxiosError(rawData) ? rawData.toJSON() : rawData;

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

  const payload = {
    level: type,
    title: stripAnsi(message),
    id,
    prefix: prefix || "no",
    // raw: data,
    appVersion: logTags[0],
    appHost: logTags[1],
    ...logData,
  };

  if (data instanceof Error) {
    // @ts-expect-error We want to put the Error as a first argument to see the stacktrace
    bulkLogger[type](data, payload);
    return;
  }
  bulkLogger[type]({ ...payload, message: stripAnsi(message) });
};
