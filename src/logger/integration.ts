import { createLogger, format, transports } from "winston";
import stripAnsi from "strip-ansi";
import Logsene from "winston-logsene";
import { isAxiosError, AxiosError } from "axios";
import { selfUrl, logApiTokenV2, appVersion, isDebug } from "../env.js";
import { LogType, SANITIZE_CHARACTER } from "./const.js";

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

const logTransports = [
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
    ? [new transports.Console(), ...logTransports]
    : logTransports,
});

const sanitizeError = (rawData: unknown): unknown => {
  if (!isAxiosError(rawData)) {
    return rawData;
  }

  // Axios .toJSON() returns object, not AxiosError :sad:
  const data = rawData.toJSON() as AxiosError;

  // Sanitize the authorization token to keep secrets safe
  if (data?.config?.headers?.Authorization) {
    data.config.headers.Authorization = SANITIZE_CHARACTER;
  }

  // Sanitize the incoming buffer to keep user data safe and the log small
  if (data.config?.data) {
    data.config.data = SANITIZE_CHARACTER;
  }

  return data;
};

export const sendLogs = (
  type: LogType,
  id: string,
  prefix: string,
  message: string,
  rawData: unknown,
): void => {
  if (!logTransports.length) {
    return;
  }
  const data = sanitizeError(rawData);

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
