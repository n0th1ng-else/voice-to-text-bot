import { type ApiErrorReflector } from "./types.js";
import { TelegramBaseApi } from "./groups/core.js";
import { TelegramPaymentsApi } from "./groups/payments/payments-api.js";
import { TelegramUpdatesApi } from "./groups/updates/updates-api.js";
import { TelegramChatsApi } from "./groups/chats/chats-api.js";
import { getMTProtoApi, type TgProto } from "./tgMTProtoApi.js";
import type { ChatId, FileId } from "./core.js";

export const TELEGRAM_API_MAX_MESSAGE_SIZE = 4096;

export class TelegramApi {
  private readonly baseClient: TelegramBaseApi;
  private readonly proto: TgProto;
  private readonly useMTProto: boolean;

  public readonly chats: TelegramChatsApi;
  public readonly updates: TelegramUpdatesApi;
  public readonly payments: TelegramPaymentsApi;

  constructor(
    apiToken: string,
    appId: number,
    appHash: string,
    useMTProto: boolean,
  ) {
    this.baseClient = new TelegramBaseApi(apiToken);
    this.proto = getMTProtoApi(appId, appHash, apiToken);
    this.chats = new TelegramChatsApi(this.baseClient, apiToken);
    this.updates = new TelegramUpdatesApi(this.baseClient);
    this.payments = new TelegramPaymentsApi(this.baseClient);
    this.useMTProto = useMTProto;
  }

  public async init(): Promise<this> {
    if (this.useMTProto) {
      await this.proto.start();
    }
    return this;
  }

  public async stop(): Promise<this> {
    if (this.useMTProto) {
      await this.proto.stop();
    }
    return this;
  }

  public async downloadFile(
    toFilename: string,
    fileId: FileId,
    chatId: ChatId,
  ): Promise<[string, boolean]> {
    if (this.useMTProto && this.proto.isInitialized()) {
      await this.proto.downloadFile(toFilename, fileId);
      return [toFilename, true];
    }

    const fileUrl = await this.chats.getFile(fileId, chatId);
    return [fileUrl, false];
  }

  public setErrorReflector(errorReflector: ApiErrorReflector): void {
    this.baseClient.setErrorReflector(errorReflector);
  }
}
