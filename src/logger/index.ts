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
    const idPrefix = `[${this.id}]`;
    const timePrefix = `[${this.time}]`;
    return `${timePrefix} ${idPrefix}`;
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

  constructor(private readonly id: string = "") {}

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public info(msg: string, ...message: any[]): void {
    // eslint-disable-next-line no-console
    console.log(Logger.g(this.prefix), msg, ...message);
    sendLogs(LogType.Info, this.id, msg);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public warn(msg: string, ...data: any[]): void {
    // eslint-disable-next-line no-console
    console.warn(Logger.y(this.prefix), msg, ...data);
    sendLogs(LogType.Warn, this.id, msg, data);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public error(msg: string, ...data: any[]): void {
    // eslint-disable-next-line no-console
    console.error(Logger.r(this.prefix), Logger.r(msg), ...data);
    sendLogs(LogType.Error, this.id, msg, data);
  }
}
