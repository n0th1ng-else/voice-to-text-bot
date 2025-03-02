import { type ApiErrorReflector } from "./types.js";
import { TelegramBaseApi } from "./groups/core.js";
import { TelegramPaymentsApi } from "./groups/payments/payments-api.js";
import { TelegramUpdatesApi } from "./groups/updates/updates-api.js";
import { TelegramChatsApi } from "./groups/chats/chats-api.js";

export const TELEGRAM_API_MAX_MESSAGE_SIZE = 4096;

export class TelegramApi {
  public readonly chats: TelegramChatsApi;
  public readonly updates: TelegramUpdatesApi;
  public readonly payments: TelegramPaymentsApi;

  constructor(apiToken: string, errorReflector?: ApiErrorReflector) {
    const client = new TelegramBaseApi(apiToken, errorReflector);
    this.chats = new TelegramChatsApi(client, apiToken);
    this.updates = new TelegramUpdatesApi(client);
    this.payments = new TelegramPaymentsApi(client);
  }
}
