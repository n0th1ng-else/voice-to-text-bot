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

  private static d(message: string | number): string {
    return typeof message === "string" ? message : String(message);
  }

  private additionalPrefix = "";

  constructor(private readonly id = "") {}

  public setAdditionalPrefix(prefix: string): void {
    this.additionalPrefix = prefix;
  }

  public debug(...messages: unknown[]): void {
    this.output(...messages);
  }

  public info(...messages: unknown[]): void {
    this.output(...messages);
  }

  public warn(...messages: unknown[]): void {
    this.output(...messages);
  }

  public error(...messages: unknown[]): void {
    this.output(...messages);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public output(...message: unknown[]): void {
    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    const additionalPrefix = this.additionalPrefix
      ? `[${this.additionalPrefix}]`
      : "";
    // console.log(prefix, additionalPrefix, ...message);
  }
}
