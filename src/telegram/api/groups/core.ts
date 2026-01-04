import axios, { type AxiosResponse, isAxiosError } from "axios";
import type { z } from "zod";
import type { ApiErrorReflector, TgCore } from "../types.js";
import { TgError } from "../tgerror.js";
import type { ChatId } from "../core.js";
import { API_TIMEOUT_MS } from "../../../const.js";
import { unknownHasMessage } from "../../../server/error.js";

export class TelegramBaseApi {
  public static readonly url = "https://api.telegram.org";
  public static readonly timeout = API_TIMEOUT_MS;

  private static readonly path = "bot";

  private readonly apiToken: string;
  private errorReflector?: ApiErrorReflector;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  public setErrorReflector(errorReflector: ApiErrorReflector): void {
    this.errorReflector = errorReflector;
  }

  public getApiUrl(methodName: string): string {
    return `/${TelegramBaseApi.path}${this.apiToken}/${methodName}`;
  }

  public async requestValidate<Output, Input = Output, Data = unknown>(
    methodName: string,
    schema: z.ZodType<Output, Input>,
    data?: Data,
    chatId?: ChatId,
  ): Promise<z.infer<z.ZodType<Output, Input>>> {
    const result = await this.request(methodName, data, chatId);
    return schema.parse(result);
  }

  private async request<Response, Data>(
    methodName: string,
    data?: Data,
    chatId?: ChatId,
  ): Promise<Response> {
    const url = this.getApiUrl(methodName);

    let response: AxiosResponse<TgCore<Response>> | null = null;

    try {
      response = await axios.request<TgCore<Response>>({
        url,
        data,
        method: "POST",
        baseURL: TelegramBaseApi.url,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: TelegramBaseApi.timeout,
        responseType: "json",
      });
    } catch (err) {
      const tgError = new TgError(err, unknownHasMessage(err) ? err.message : undefined)
        .setUrl(url, this.apiToken)
        .setChatId(chatId);

      if (isAxiosError(err)) {
        tgError.setErrorCode(err.response?.status).setResponse(err.response?.data);
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.errorReflector?.(tgError);
      throw tgError;
    }

    const answer = response.data;
    if (!answer.ok) {
      const tgError = new TgError(new Error(answer.description), answer.description)
        .setUrl(url, this.apiToken)
        .setErrorCode(answer.error_code)
        .setRetryAfter(answer?.parameters?.retry_after)
        .setMigrateToChatId(answer?.parameters?.migrate_to_chat_id)
        .setChatId(chatId);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.errorReflector?.(tgError);
      throw tgError;
    }

    return answer.result;
  }

  private async request_v2<Res, Data>(
    methodName: string,
    data?: Data,
    chatId?: ChatId,
  ): Promise<Res> {
    const url = this.getApiUrl(methodName);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(TelegramBaseApi.timeout),
      });

      if (!response.ok) {
        // throw TgError
      }
    } catch (err) {
      const tgError = new TgError(err, unknownHasMessage(err) ? err.message : undefined)
        .setUrl(url, this.apiToken)
        .setChatId(chatId);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.errorReflector?.(tgError);
      throw tgError;
    }

    try {
      const answer = (await response.json()) as TgCore<Res>;

      if (!answer.ok) {
        const tgError = new TgError(new Error(answer.description), answer.description)
          .setUrl(url, this.apiToken)
          .setErrorCode(answer.error_code)
          .setRetryAfter(answer?.parameters?.retry_after)
          .setMigrateToChatId(answer?.parameters?.migrate_to_chat_id)
          .setChatId(chatId);

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.errorReflector?.(tgError);
        throw tgError;
      }

      return answer.result;
    } catch (err) {
      const tgError = new TgError(err, "Invalid JSON response")
        .setUrl(url, this.apiToken)
        .setChatId(chatId);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.errorReflector?.(tgError);
      throw tgError;
    }
  }
}
