import type { VoidPromise } from "../common/types.ts";
import type { TelegramBotModel } from "../telegram/bot.ts";
import type { getDb } from "../db/index.ts";

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
  ssl: HealthSsl;
  message: string;
  urls: string[];
  version: string;
  threadId: number;
  serverName: string;
  nodeVersion: string;
};

export const HealthStatus = {
  Error: "ERROR",
  InProgress: "IN_PROGRESS",
  Online: "ONLINE",
} as const;

export const HealthSsl = {
  On: "ON",
  Off: "OFF",
};

export class HealthModel {
  private readonly ssl: HealthSsl;
  private status = HealthStatus.InProgress;
  private message = "Waiting for bots to set up";
  private urls: string[] = [];
  private readonly version: string;
  private readonly threadId: number;
  private readonly serverName: string;
  private readonly coreVersion: string;

  constructor(
    version: string,
    isHttps: boolean,
    threadId: number,
    serverName: string,
    coreVersion: string,
  ) {
    this.version = version;
    this.threadId = threadId;
    this.serverName = serverName;
    this.coreVersion = coreVersion;
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
