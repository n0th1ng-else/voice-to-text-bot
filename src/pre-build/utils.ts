import picocolors from "picocolors";

const { green } = picocolors;

export class BaseLogger {
  public static g(message: string | number): string {
    const msg = typeof message === "string" ? message : String(message);
    return green(msg);
  }

  private getFullPrefix(includeTime = true): string {
    const prefixes = this.getRawPrefixes(includeTime);
    return prefixes.map((prefix) => `[${prefix}]`).join("");
  }

  private getRawPrefixes(includeTime: boolean): string[] {
    const prefixes = [];

    if (includeTime) {
      prefixes.push(this.time);
    }

    prefixes.push(this.id);

    return prefixes;
  }

  private get time(): string {
    const now = new Date();
    const minute = 60_000;
    const timezoneOffset = now.getTimezoneOffset() * minute;
    const dateOffset = now.getTime() - timezoneOffset;
    const localDate = new Date(dateOffset);
    const timeLineStart = 0;
    const timeLineSize = 23;
    return localDate.toISOString().slice(timeLineStart, timeLineSize).replace("T", " ");
  }

  private readonly id: string;

  constructor(id = "") {
    this.id = id;
  }

  public info(msg: string, ...data: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(BaseLogger.g(this.getFullPrefix()), msg, ...data);
  }
}
