import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import stripAnsi from "strip-ansi";
import { type AxiosError, isAxiosError } from "axios";
import { SANITIZE_CHARACTER } from "../logger/const.js";
import { isOtelEnabled } from "./utils.js";

export type OtelLogger = {
  debug: (ids: string[], msg: string, data: unknown) => void;
  info: (ids: string[], msg: string, data: unknown) => void;
  warn: (
    ids: string[],
    msg: string,
    data: Record<string, unknown> | undefined,
  ) => void;
  error: (ids: string[], msg: string, data: unknown) => void;
};

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
    // @ts-expect-error it's okay. trying to flatten the object for the logger
    res[`${recordKey}-${key}`] = data[key];
    return res;
  }, {});
};

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

export const getOtelLogger = (id: string): OtelLogger | undefined => {
  if (!isOtelEnabled()) {
    return;
  }

  const log = logs.getLoggerProvider().getLogger(id);

  const sendLog = (
    level: SeverityNumber,
    ids: string[],
    msg: string,
    rawData: unknown,
  ): void => {
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

    log.emit({
      severityNumber: level,
      body: stripAnsi(msg),
      attributes: {
        path: ids,
        meta: logData,
      },
    });
  };

  return {
    debug: (ids: string[], msg: string, data: unknown): void => {
      sendLog(SeverityNumber.DEBUG, ids, msg, data);
    },
    info: (ids: string[], msg: string, data: unknown): void => {
      sendLog(SeverityNumber.INFO, ids, msg, data);
    },
    warn: (
      ids: string[],
      msg: string,
      data: Record<string, unknown> | undefined,
    ): void => {
      sendLog(SeverityNumber.WARN, ids, msg, data);
    },
    error: (ids: string[], msg: string, data: unknown): void => {
      sendLog(SeverityNumber.ERROR, ids, msg, data);
    },
  };
};
