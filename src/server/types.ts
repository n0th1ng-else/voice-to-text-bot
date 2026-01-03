import type { ValueOf, VoidPromise } from "../common/types.js";
import type { TelegramBotModel } from "../telegram/bot.js";
import type { getDb } from "../db/index.js";
import type { RuntimeEngineType } from "../engines/index.js";

export type ServerStatCore = ReturnType<typeof getDb>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface BotServerModel extends BotServerModelBase {
  start(): Promise<VoidPromise | VoidFunction>;
  applyHostLocation(launchDelay?: number): Promise<void>;
  triggerDaemon(
    nextReplicaUrl: string,
    lifecycleInterval: number,
    timeoutMs: number,
  ): Promise<void>;
  setBots(bots: TelegramBotModel[]): this;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface BotServerModelBase {
  setThreadId(threadId: number): this;
  setStat(stat: ServerStatCore): this;
  setSelfUrl(url: string): this;
  setRuntimeVersion(type: RuntimeEngineType, version: string): this;
}

export type NotFoundDto = {
  status: 404;
  message: string;
  error: string;
};

export type HealthDto = {
  status: HealthStatusType;
  ssl: HealthSslType;
  message: string;
  urls: string[];
  version: string;
  threadId: number;
  serverName: string;
  runtimeType: RuntimeEngineType;
  runtimeVersion: string;
  daysOnlineCurrent: number;
  daysOnlineLimit: number;
};

export const HealthStatus = {
  Error: "ERROR",
  InProgress: "IN_PROGRESS",
  Online: "ONLINE",
} as const;

export type HealthStatusType = ValueOf<typeof HealthStatus>;

export const HealthSsl = {
  On: "ON",
  Off: "OFF",
} as const;

export type HealthSslType = ValueOf<typeof HealthSsl>;

export class HealthModel {
  private readonly ssl: HealthSslType;
  private readonly version: string;
  private readonly threadId: number;
  private readonly serverName: string;
  private readonly runtimeType: RuntimeEngineType;
  private readonly runtimeVersion: string;
  private status: HealthStatusType = HealthStatus.InProgress;
  private message = "Waiting for bots to set up";
  private urls: string[] = [];
  private daysOnlineCurrent = 0;
  private daysOnlineLimit = 0;

  constructor(
    version: string,
    isHttps: boolean,
    threadId: number,
    serverName: string,
    runtimeType: RuntimeEngineType,
    runtimeVersion: string,
  ) {
    this.version = version;
    this.threadId = threadId;
    this.serverName = serverName;
    this.runtimeType = runtimeType;
    this.runtimeVersion = runtimeVersion;
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

  public setDaysOnline(current: number, limit: number): void {
    this.daysOnlineCurrent = current;
    this.daysOnlineLimit = limit;
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
      runtimeType: this.runtimeType,
      runtimeVersion: this.runtimeVersion,
      daysOnlineCurrent: this.daysOnlineCurrent,
      daysOnlineLimit: this.daysOnlineLimit,
    };
  }
}
