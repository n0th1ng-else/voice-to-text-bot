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

  private additionalPrefix = "";

  constructor(private readonly id: string = "") {}

  public setAdditionalPrefix(prefix: string): void {
    this.additionalPrefix = prefix;
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  public info(...messages: any[]): void {
    // this.output(...messages);
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
    const additionalPrefix = this.additionalPrefix
      ? `[${this.additionalPrefix}]`
      : "";
    // eslint-disable-next-line no-console
    console.log(prefix, additionalPrefix, ...message);
  }
}
