import type { TelegramBaseApi } from "../core.js";
import {
  type BotCommandDto,
  type BotCommandListDto,
  type TgWebHook,
  type SetWebHookDto,
  TgWebHookSchema,
  TgSetWebHookSchema,
  TgAnswerSetCommands,
} from "./updates-types.js";

export class TelegramUpdatesApi {
  private readonly client: TelegramBaseApi;

  constructor(client: TelegramBaseApi) {
    this.client = client;
  }

  public async getWebHookInfo(): Promise<TgWebHook> {
    return this.client.requestValidate("getWebhookInfo", TgWebHookSchema);
  }

  public async setWebHook(hookUrl: string): Promise<boolean> {
    const data: SetWebHookDto = {
      url: encodeURI(hookUrl),
      drop_pending_updates: true,
    };

    return this.client.requestValidate("setWebHook", TgSetWebHookSchema, data);
  }

  public async setMyCommands(commands: BotCommandDto[]): Promise<boolean> {
    const data: BotCommandListDto = {
      commands,
    };
    return this.client.requestValidate("setMyCommands", TgAnswerSetCommands, data);
  }
}
