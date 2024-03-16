import type { VoidPromise } from "../common/types.js";
import type { TelegramBotModel } from "../telegram/bot.js";
import type { getDb } from "../db/index.js";

export type ServerStatCore = ReturnType<typeof getDb>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface BotServerModel {
  readonly serverName: string;
  start(): Promise<VoidPromise | VoidFunction>;
  applyHostLocation(launchDelay?: number): Promise<void>;
  triggerDaemon(
    nextReplicaUrl: string,
    lifecycleInterval: number,
    timeoutMs: number,
  ): void;
  setSelfUrl(url: string): this;
  setBots(bots: TelegramBotModel[]): this;
  setStat(stat: ServerStatCore): this;
  setThreadId(threadId: number): this;
}

export type NotFoundDto = {
  status: 404;
  message: string;
  error: string;
};

export type HealthDto = {
  status: HealthStatus;
  ssl: HealthSsl;
  message: string;
  urls: string[];
  version: string;
  threadId: number;
  serverName: string;
};

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
    private readonly threadId: number,
    private readonly serverName: string,
  ) {
    this.ssl = isHttps ? HealthSsl.On : HealthSsl.Off;
  }

  public setOnline(urls: string[]): void {
    this.status = HealthStatus.Online;
    this.message = "All is good";
    this.urls = [...urls];
  }

  public setMessage(message: string, isError = false): void {
    this.message = message;
    if (isError) {
      this.status = HealthStatus.Error;
    }
  }

  public getDto(): HealthDto {
    return {
      ssl: this.ssl,
      version: this.version,
      status: this.status,
      urls: this.urls,
      message: this.message,
      threadId: this.threadId,
      serverName: this.serverName,
    };
  }
}
