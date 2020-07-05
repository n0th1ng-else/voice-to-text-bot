export class Logger {
  public static g(message: string | number): string {
    return typeof message === "string" ? message : String(message);
  }

  public static y(message: string | number): string {
    return typeof message === "string" ? message : String(message);
  }

  public static r(message: string | number): string {
    return typeof message === "string" ? message : String(message);
  }

  constructor(private readonly id: string = "") {}

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public info(...messages: any[]): void {
    this.output(...messages);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public warn(...messages: any[]): void {
    this.output(...messages);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public error(...messages: any[]): void {
    this.output(...messages);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public output(...message: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.log(Logger.g(prefix), ...message);
  }
}
