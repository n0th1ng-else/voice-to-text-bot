import { green, red, yellow } from "chalk";

export class Logger {
  constructor(private readonly id: string = "") {}

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public info(...message: any[]): void {
    // eslint-disable-next-line no-console
    console.log(this.g(`[${this.id}]`), ...message);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public warn(...message: any[]): void {
    // eslint-disable-next-line no-console
    console.warn(this.y(`[${this.id}]`), ...message);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public error(...message: any[]): void {
    // eslint-disable-next-line no-console
    console.error(this.r(`[${this.id}]`), ...message);
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
