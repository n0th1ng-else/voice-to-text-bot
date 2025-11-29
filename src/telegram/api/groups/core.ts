import axios, { type AxiosError, type AxiosInstance } from "axios";
import type { z } from "zod";
import type { ApiErrorReflector, TgCore } from "../types.js";
import { TgError } from "../tgerror.js";
import type { ChatId } from "../core.js";
import { API_TIMEOUT_MS } from "../../../const.js";

export class TelegramBaseApi {
  public static readonly url = "https://api.telegram.org";
  public static readonly timeout = API_TIMEOUT_MS;

  private static readonly path = "bot";

  private readonly client: AxiosInstance;
  private readonly apiToken: string;
  private errorReflector?: ApiErrorReflector;

  constructor(apiToken: string) {
    this.apiToken = apiToken;

    this.client = axios.create({
      method: "POST",
      baseURL: TelegramBaseApi.url,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: TelegramBaseApi.timeout,
      responseType: "json",
    });
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

  private request<Response, Data>(
    methodName: string,
    data?: Data,
    chatId?: ChatId,
  ): Promise<Response> {
    const url = this.getApiUrl(methodName);
    return this.client.request<TgCore<Response>>({ url, data }).then(
      (response) => {
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
          return Promise.reject(tgError);
        }

        return answer.result;
      },
      (err: AxiosError<TgCore<void>>) => {
        const tgError = new TgError(err, err.message)
          .setUrl(url, this.apiToken)
          .setErrorCode(err?.response?.status)
          .setResponse(err?.response?.data)
          .setChatId(chatId);

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.errorReflector?.(tgError);
        throw tgError;
      },
    );
  }
}
