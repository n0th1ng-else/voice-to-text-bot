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

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  public debug(...messages: any[]): void {
    this.output(...messages);
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  public output(...message: any[]): void {
    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    const prefix = `[${this.id}]`;
    // eslint-disable-next-line  @typescript-eslint/no-unused-vars
    const additionalPrefix = this.additionalPrefix
      ? `[${this.additionalPrefix}]`
      : "";
    // eslint-disable-next-line no-console
    // console.log(prefix, additionalPrefix, ...message);
  }
}
