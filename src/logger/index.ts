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

  constructor(private readonly id: string = "") {}

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public info(msg: string, ...message: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.log(Logger.g(prefix), msg, ...message);
    sendLogs(LogType.Info, this.id, msg);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public warn(msg: string, ...data: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.warn(Logger.y(prefix), msg, ...data);
    sendLogs(LogType.Warn, this.id, msg, data);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public error(msg: string, ...data: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.error(Logger.r(prefix), Logger.r(msg), ...data);
    sendLogs(LogType.Error, this.id, msg, data);
  }
}
