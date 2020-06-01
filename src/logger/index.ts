import stripAnsi from "strip-ansi";
import { green, red, yellow } from "chalk";
import { LogType, sendLogs } from "./integration";

export class Logger {
  constructor(private readonly id: string = "") {}

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public info(msg: string, ...message: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.log(this.g(prefix), msg, ...message);
    sendLogs(LogType.Info, this.id, stripAnsi(msg));
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public warn(msg: string, ...data: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.warn(this.y(prefix), msg, ...data);
    sendLogs(LogType.Warn, this.id, stripAnsi(msg), data);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public error(msg: string, ...data: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.error(this.r(prefix), this.r(msg), ...data);
    sendLogs(LogType.Error, this.id, stripAnsi(msg), data);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public g(...message: any[]): string {
    return green(...message);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public y(...message: any[]): string {
    return yellow(...message);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public r(...message: any[]): string {
    return red(...message);
  }
}
