import { green, red, yellow } from "kleur";
import { LogType, sendLogs } from "./integration";

export class Logger {
  constructor(private readonly id: string = "") {}

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public info(msg: string, ...message: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.log(this.g(prefix), msg, ...message);
    sendLogs(LogType.Info, this.id, msg);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public warn(msg: string, ...data: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.warn(this.y(prefix), msg, ...data);
    sendLogs(LogType.Warn, this.id, msg, data);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public error(msg: string, ...data: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.error(this.r(prefix), this.r(msg), ...data);
    sendLogs(LogType.Error, this.id, msg, data);
  }

  public g(message: string | number): string {
    return green(message);
  }

  public y(message: string | number): string {
    return yellow(message);
  }

  public r(message: string | number): string {
    return red(message);
  }
}
