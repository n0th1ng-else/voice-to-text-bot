import { green, red, yellow } from "chalk";

export class Logger {
  constructor(private readonly id: string = "") {}

  public info(...message: any[]): void {
    console.log(this.g(`[${this.id}]`), ...message);
  }

  public warn(...message: any[]): void {
    console.warn(this.y(`[${this.id}]`), ...message);
  }

  public error(...message: any[]): void {
    console.error(this.r(`[${this.id}]`), ...message);
  }

  public g(...message: any[]): string {
    return green(...message);
  }

  public y(...message: any[]): string {
    return yellow(...message);
  }

  public r(...message: any[]): string {
    return red(...message);
  }
}
