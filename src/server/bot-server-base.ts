import { UptimeDaemon } from "./uptime.ts";
import { Logger } from "../logger/index.ts";
import { sSuffix } from "../text/utils.ts";
import type { BotServerModelBase, ServerStatCore } from "./types.ts";
import type { TelegramBotModel } from "../telegram/bot.ts";
import type { HttpsOptions } from "../../certs/index.ts";

const logger = new Logger("server");

export abstract class BotServerBase<ServerType> implements BotServerModelBase {
  protected readonly app: ServerType;
  protected readonly uptimeDaemon: UptimeDaemon;
  protected threadId = 0;
  protected stat: ServerStatCore | null = null;
  protected selfUrl = "";
  protected bots: TelegramBotModel[] = [];
  protected isIdle = true;
  protected nodeVersion = "";
  protected readonly isHttps: boolean;

  protected readonly serverName: string;
  protected readonly port: number;
  protected readonly version: string;
  protected readonly webhookDoNotWait: boolean;
  protected readonly httpsOptions?: HttpsOptions;

  protected constructor(
    serverName: string,
    port: number,
    version: string,
    webhookDoNotWait: boolean,
    httpsOptions?: HttpsOptions,
  ) {
    this.serverName = serverName;
    this.port = port;
    this.version = version;
    this.webhookDoNotWait = webhookDoNotWait;
    this.httpsOptions = httpsOptions;
    logger.info(`Initializing ${Logger.y(this.serverName)} bot server`);

    this.isHttps = Boolean(httpsOptions);
    this.uptimeDaemon = new UptimeDaemon(version);
    this.app = this.getServerInstance();
  }

  public setThreadId(threadId: number): this {
    this.threadId = threadId;
    return this;
  }

  public setStat(stat: ServerStatCore): this {
    this.stat = stat;
    this.uptimeDaemon.setStat(stat);
    return this;
  }

  public setSelfUrl(url: string): this {
    this.selfUrl = url;
    return this;
  }

  public setNodeVersion(version: string): this {
    this.nodeVersion = version;
    return this;
  }

  protected abstract getServerInstance(): ServerType;

  protected setBots(bots: TelegramBotModel[]): this {
    this.bots = bots;
    logger.info(`Requested ${Logger.y(sSuffix("bot", bots.length))} to set up`);
    return this;
  }
}
