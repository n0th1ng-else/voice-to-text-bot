import { type ApiErrorReflector } from "./types.js";
import { TelegramBaseApi } from "./groups/core.js";
import { TelegramPaymentsApi } from "./groups/payments/payments-api.js";
import { TelegramUpdatesApi } from "./groups/updates/updates-api.js";
import { TelegramChatsApi } from "./groups/chats/chats-api.js";

export const TELEGRAM_API_MAX_MESSAGE_SIZE = 4096;

export class TelegramApi {
  private readonly baseClient: TelegramBaseApi;

  public readonly chats: TelegramChatsApi;
  public readonly updates: TelegramUpdatesApi;
  public readonly payments: TelegramPaymentsApi;

  constructor(apiToken: string) {
    this.baseClient = new TelegramBaseApi(apiToken);
    this.chats = new TelegramChatsApi(this.baseClient, apiToken);
    this.updates = new TelegramUpdatesApi(this.baseClient);
    this.payments = new TelegramPaymentsApi(this.baseClient);
  }

  public setErrorReflector(errorReflector: ApiErrorReflector): void {
    this.baseClient.setErrorReflector(errorReflector);
  }
}
