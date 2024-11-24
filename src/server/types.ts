import type { ValueOf, VoidPromise } from "../common/types.js";
import type { TelegramBotModel } from "../telegram/bot.js";
import type { getDb } from "../db/index.js";

export type ServerStatCore = ReturnType<typeof getDb>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface BotServerModel extends BotServerModelBase {
  start(): Promise<VoidPromise | VoidFunction>;
  applyHostLocation(launchDelay?: number): Promise<void>;
  triggerDaemon(
    nextReplicaUrl: string,
    lifecycleInterval: number,
    timeoutMs: number,
  ): void;
  setBots(bots: TelegramBotModel[]): this;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface BotServerModelBase {
  setThreadId(threadId: number): this;
  setStat(stat: ServerStatCore): this;
  setSelfUrl(url: string): this;
  setNodeVersion(version: string): this;
}

export type NotFoundDto = {
  status: 404;
  message: string;
  error: string;
};

export type HealthDto = {
  status: HealthStatus;
  ssl: HealthSslType;
  message: string;
  urls: string[];
  version: string;
  threadId: number;
  serverName: string;
  nodeVersion: string;
};

export enum HealthStatus {
  Error = "ERROR",
  InProgress = "IN_PROGRESS",
  Online = "ONLINE",
}

export const HealthSsl = {
  On: "ON",
  Off: "OFF",
} as const;

export type HealthSslType = ValueOf<typeof HealthSsl>;

export class HealthModel {
  private readonly ssl: HealthSslType;
  private status = HealthStatus.InProgress;
  private message = "Waiting for bots to set up";
  private urls: string[] = [];

  constructor(
    private readonly version: string,
    isHttps: boolean,
    private readonly threadId: number,
    private readonly serverName: string,
    private readonly coreVersion: string,
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
      nodeVersion: this.coreVersion,
    };
  }
}
