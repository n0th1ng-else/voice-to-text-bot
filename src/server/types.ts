export interface HealthDto {
  status: HealthStatus;
  ssl: HealthSsl;
  message: string;
  urls: string[];
  version: string;
  threadId: number;
}

export enum HealthStatus {
  Error = "ERROR",
  InProgress = "IN_PROGRESS",
  Online = "ONLINE",
}

export enum HealthSsl {
  On = "ON",
  Off = "OFF",
}

export class HealthModel {
  private readonly ssl: HealthSsl;
  private status = HealthStatus.InProgress;
  private message = "Waiting for bots to set up";
  private urls: string[] = [];

  constructor(
    private readonly version: string,
    isHttps: boolean,
    private readonly threadId: number
  ) {
    this.ssl = isHttps ? HealthSsl.On : HealthSsl.Off;
  }

  public setOnline(urls: string[]): void {
    this.status = HealthStatus.Online;
    this.message = "All is good";
    this.urls = [...urls];
  }

  public setError(errMessage: string): void {
    this.status = HealthStatus.Error;
    this.message = errMessage;
  }

  public getDto(): HealthDto {
    return {
      ssl: this.ssl,
      version: this.version,
      status: this.status,
      urls: this.urls,
      message: this.message,
      threadId: this.threadId,
    };
  }
}
