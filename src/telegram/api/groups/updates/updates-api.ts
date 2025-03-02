import type { TelegramBaseApi } from "../core.js";
import {
  type BotCommandDto,
  type BotCommandListDto,
  type TgWebHook,
  TgWebHookSchema,
  TgSetWebHookSchema,
} from "./updates-types.js";

export class TelegramUpdatesApi {
  private readonly client: TelegramBaseApi;

  constructor(client: TelegramBaseApi) {
    this.client = client;
  }

  public getWebHookInfo(): Promise<TgWebHook> {
    return this.client.requestValidate("getWebhookInfo", TgWebHookSchema);
  }

  public setWebHook(hookUrl: string): Promise<boolean> {
    return this.client.requestValidate("setWebHook", TgSetWebHookSchema, {
      url: hookUrl,
    });
  }

  public setMyCommands(commands: BotCommandDto[]): Promise<boolean> {
    return this.client.request<boolean, BotCommandListDto>("setMyCommands", {
      commands,
    });
  }
}
