import { createLogger, format, transports } from "winston";
import stripAnsi from "strip-ansi";
import { Loggly } from "winston-loggly-bulk";
import { selfUrl, logApi, appVersion } from "../env";

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

const logglyTransport = isLoggingEnabled()
  ? [
      new Loggly({
        token: logApi.apiToken,
        subdomain: logApi.projectId,
        tags: [`app.${appVersion}`, `host.${plainHost}`],
        json: true,
      }),
    ]
  : [];

const { combine, json, errors } = format;
const bulkLogger = createLogger({
  format: combine(errors({ stack: true }), json()),
  transports: [new transports.Console(), ...logglyTransport],
});

export const sendLogs = (
  type: LogType,
  id: string,
  prefix: string,
  message: string,
  data: unknown
): void => {
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

  const payload = {
    level: type,
    title: stripAnsi(message),
    id,
    prefix: prefix || "no",
    raw: data,
    ...logData,
  };

  if (data instanceof Error) {
    // @ts-expect-error We want to put the Error as a first argument to see the stacktrace
    bulkLogger[type](data, payload);
    return;
  }
  bulkLogger[type]({ ...payload, message: stripAnsi(message) });
};
