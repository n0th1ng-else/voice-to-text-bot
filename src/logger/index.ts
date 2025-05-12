import cluster from "node:cluster";
import picocolors from "picocolors";
import { z } from "zod";
import { captureError, captureWarning } from "../monitoring/sentry.js";
import { logLevel } from "../env.js";
import { getOtelLogger, type OtelLogger } from "../otel/logs.js";

const LogLevelSchema = z
  .union([
    z.literal("DEBUG"),
    z.literal("INFO"),
    z.literal("WARN"),
    z.literal("ERROR"),
  ])
  .catch("INFO")
  .describe("Validation schema for the logging level");

type LogLevel = z.infer<typeof LogLevelSchema>;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
} as const;

const { green, red, yellow, dim } = picocolors;

export class Logger {
  public static g(message: string | number): string {
    const msg = typeof message === "string" ? message : String(message);
    return green(msg);
  }

  public static y(message: string | number): string {
    const msg = typeof message === "string" ? message : String(message);
    return yellow(msg);
  }

  public static r(message: string | number): string {
    const msg = typeof message === "string" ? message : String(message);
    return red(msg);
  }

  private static d(message: string | number): string {
    const msg = typeof message === "string" ? message : String(message);
    return dim(msg);
  }

  private get prefix(): string {
    const prefixes = this.getRawPrefixes(true);
    return prefixes.map((prefix) => `[${prefix}]`).join("");
  }

  private getRawPrefixes(includeTime = false): string[] {
    const prefixes = [this.id];
    if (this.additionalPrefix) {
      prefixes.push(this.additionalPrefix);
    }

    if (includeTime) {
      prefixes.push(this.time);
    }

    return prefixes;
  }

  private get time(): string {
    const now = new Date();
    const minute = 60_000;
    const timezoneOffset = now.getTimezoneOffset() * minute;
    const dateOffset = now.getTime() - timezoneOffset;
    const localDate = new Date(dateOffset);
    const timeLineStart = 0;
    const timeLineSize = 23;
    return localDate
      .toISOString()
      .slice(timeLineStart, timeLineSize)
      .replace("T", " ");
  }

  private readonly additionalPrefix: string;
  private readonly level: number;
  private readonly id: string;
  private readonly otelLogger?: OtelLogger;

  constructor(id = "", level = logLevel) {
    this.id = id;
    const threadId = cluster.isMaster ? 0 : cluster?.worker?.id || 0;
    this.additionalPrefix = `thread-${threadId}`;
    const logType = LogLevelSchema.parse(level);
    this.level = LOG_LEVEL_PRIORITY[logType];
    this.otelLogger = getOtelLogger(this.id);
  }

  public debug(msg: string, ...data: unknown[]): void {
    if (LOG_LEVEL_PRIORITY.DEBUG < this.level) {
      return;
    }
    // eslint-disable-next-line no-console
    console.log(Logger.g(this.prefix), Logger.d(msg), ...data);
    this.otelLogger?.debug(this.getRawPrefixes(), msg, data);
  }

  public info(msg: string, ...data: unknown[]): void {
    if (LOG_LEVEL_PRIORITY.INFO < this.level) {
      return;
    }
    // eslint-disable-next-line no-console
    console.log(Logger.g(this.prefix), msg, ...data);
    this.otelLogger?.info(this.getRawPrefixes(), msg, data);
  }

  public warn(
    msg: string,
    data?: Record<string, unknown>,
    shouldReport = false,
  ): void {
    if (LOG_LEVEL_PRIORITY.WARN < this.level) {
      return;
    }
    // eslint-disable-next-line no-console
    console.warn(Logger.y(this.prefix), msg, data ?? "");
    this.otelLogger?.warn(this.getRawPrefixes(), msg, data);

    if (shouldReport) {
      captureWarning(msg, data);
    }
  }

  public error(msg: string, data: unknown): void {
    if (LOG_LEVEL_PRIORITY.ERROR < this.level) {
      return;
    }
    // eslint-disable-next-line no-console
    console.error(Logger.r(this.prefix), Logger.r(msg), data ?? "");
    this.otelLogger?.error(this.getRawPrefixes(), msg, data);
    captureError(data);
  }
}
