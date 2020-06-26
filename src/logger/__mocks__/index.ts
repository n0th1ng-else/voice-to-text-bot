export class Logger {
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

  public g(message: string | number): string {
    return typeof message === "string" ? message : String(message);
  }

  public y(message: string | number): string {
    return typeof message === "string" ? message : String(message);
  }

  public r(message: string | number): string {
    return typeof message === "string" ? message : String(message);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public output(...message: any[]): void {
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line no-console
    console.log(this.g(prefix), ...message);
  }
}
