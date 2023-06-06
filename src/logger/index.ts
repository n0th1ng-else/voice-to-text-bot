import cluster from "node:cluster";
import picocolors from "picocolors";
import { sendLogs } from "./integration.js";
import { captureError } from "../monitoring/sentry.js";

const { green, red, yellow } = picocolors;

export class Logger {
  public static g(message: string | number): string {
    return green(`${message}`);
  }

  public static y(message: string | number): string {
    return yellow(`${message}`);
  }

  public static r(message: string | number): string {
    return red(`${message}`);
  }

  private get prefix(): string {
    const prefixes = [this.id, this.time];
    if (this.additionalPrefix) {
      prefixes.push(this.additionalPrefix);
    }

    return prefixes.map((prefix) => `[${prefix}]`).join(" ");
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

  constructor(private readonly id: string = "") {
    const threadId = cluster.isMaster ? 0 : cluster?.worker?.id || 0;
    this.additionalPrefix = `thread-${threadId}`;
  }

  public info(msg: string, ...data: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(Logger.g(this.prefix), msg, ...data);
    sendLogs("info", this.id, this.additionalPrefix, msg, data);
  }

  public warn(msg: string, data?: unknown): void {
    // eslint-disable-next-line no-console
    console.warn(Logger.y(this.prefix), msg, data ?? "");
    sendLogs("warn", this.id, this.additionalPrefix, msg, data);
  }

  public error(msg: string, data: unknown): void {
    // eslint-disable-next-line no-console
    console.error(Logger.r(this.prefix), Logger.r(msg), data ?? "");
    sendLogs("error", this.id, this.additionalPrefix, msg, data);
    captureError(data);
  }
}
