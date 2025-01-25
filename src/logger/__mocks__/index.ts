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
  private readonly id: string;

  constructor(id = "") {
    this.id = id;
  }

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

  public output(...message: unknown[]): void {
    const prefix = `[${this.id}]`;

    const additionalPrefix = this.additionalPrefix
      ? `[${this.additionalPrefix}]`
      : "";

    const showLogs = process.env.ENABLE_LOGGER === "true";
    if (showLogs) {
      // eslint-disable-next-line no-console
      console.log(prefix, additionalPrefix, ...message);
    }
  }
}
