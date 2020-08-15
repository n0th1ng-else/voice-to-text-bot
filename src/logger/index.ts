import { green, red, yellow } from "kleur";
import { LogType, sendLogs } from "./integration";

export class Logger {
  public static g(message: string | number): string {
    return green(message);
  }

  public static y(message: string | number): string {
    return yellow(message);
  }

  public static r(message: string | number): string {
    return red(message);
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

  private additionalPrefix = "";

  constructor(private readonly id: string = "") {}

  public setAdditionalPrefix(prefix: string): void {
    this.additionalPrefix = prefix;
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public info(msg: string, ...data: any[]): void {
    // eslint-disable-next-line no-console
    console.log(Logger.g(this.prefix), msg, ...data);
    sendLogs(LogType.Info, this.id, this.additionalPrefix, msg, data);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public warn(msg: string, ...data: any[]): void {
    // eslint-disable-next-line no-console
    console.warn(Logger.y(this.prefix), msg, ...data);
    sendLogs(LogType.Warn, this.id, this.additionalPrefix, msg, data);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public error(msg: string, ...data: any[]): void {
    // eslint-disable-next-line no-console
    console.error(Logger.r(this.prefix), Logger.r(msg), ...data);
    sendLogs(LogType.Error, this.id, this.additionalPrefix, msg, data);
  }
}
