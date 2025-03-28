import { type ApiErrorReflector } from "./types.js";
import { TelegramBaseApi } from "./groups/core.js";
import { TelegramPaymentsApi } from "./groups/payments/payments-api.js";
import { TelegramUpdatesApi } from "./groups/updates/updates-api.js";
import { TelegramChatsApi } from "./groups/chats/chats-api.js";
import { getMTProtoApi, type TgProto } from "./tgMTProtoApi.js";
import type { FileId } from "./core.js";

export const TELEGRAM_API_MAX_MESSAGE_SIZE = 4096;

export class TelegramApi {
  private readonly baseClient: TelegramBaseApi;
  private readonly proto: TgProto;

  public readonly chats: TelegramChatsApi;
  public readonly updates: TelegramUpdatesApi;
  public readonly payments: TelegramPaymentsApi;

  constructor(apiToken: string, appId: number, appHash: string) {
    this.baseClient = new TelegramBaseApi(apiToken);
    this.proto = getMTProtoApi(appId, appHash, apiToken);
    this.chats = new TelegramChatsApi(this.baseClient, apiToken);
    this.updates = new TelegramUpdatesApi(this.baseClient);
    this.payments = new TelegramPaymentsApi(this.baseClient);
  }

  public async init(): Promise<this> {
    await this.proto.start();
    return this;
  }

  public async stop(): Promise<this> {
    await this.proto.stop();
    return this;
  }

  public async downloadFile(
    toFilename: string,
    fileId: FileId,
  ): Promise<string> {
    await this.proto.downloadFile(toFilename, fileId);
    return toFilename;
  }

  public setErrorReflector(errorReflector: ApiErrorReflector): void {
    this.baseClient.setErrorReflector(errorReflector);
  }
}
