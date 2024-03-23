import { UptimeDaemon } from "./uptime.js";
import { Logger } from "../logger/index.js";

const logger = new Logger("server");

export class BotServerBase {
  protected readonly uptimeDaemon: UptimeDaemon;
  protected threadId = 0;

  constructor(
    protected readonly serverName: string,
    protected readonly port: number,
    protected readonly version: string,
  ) {
    logger.info(`Initializing ${Logger.y(this.serverName)} bot server`);

    this.uptimeDaemon = new UptimeDaemon(version);
  }

  public setThreadId(threadId: number): this {
    this.threadId = threadId;
    return this;
  }
}
