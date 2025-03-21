import axios, { type AxiosError, type AxiosInstance } from "axios";
import type { z } from "zod";
import type { ApiErrorReflector, TgCore } from "../types.js";
import { TgError } from "../tgerror.js";
import type { ChatId } from "../core.js";

export class TelegramBaseApi {
  public static readonly url = "https://api.telegram.org";
  public static readonly timeout = 10_000;

  private static readonly path = "bot";

  private readonly client: AxiosInstance;
  private readonly apiToken: string;
  private readonly errorReflector?: ApiErrorReflector;

  constructor(apiToken: string, errorReflector?: ApiErrorReflector) {
    this.apiToken = apiToken;
    this.errorReflector = errorReflector;

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

  public async requestValidate<
    Output,
    Def extends z.ZodTypeDef = z.ZodTypeDef,
    Input = Output,
    Data = unknown,
  >(
    methodName: string,
    schema: z.ZodType<Output, Def, Input>,
    data?: Data,
    chatId?: ChatId,
  ): Promise<z.infer<z.ZodType<Output, Def, Input>>> {
    const result = await this.request(methodName, data, chatId);
    return schema.parse(result);
  }

  /**
   * @deprecated Use requestValidate instead
   */
  public request<Response, Data>(
    methodName: string,
    data?: Data,
    chatId?: ChatId,
  ): Promise<Response> {
    const url = this.getApiUrl(methodName);
    return this.client.request<TgCore<Response>>({ url, data }).then(
      (response) => {
        const answer = response.data;
        if (!answer.ok) {
          const tgError = new TgError(
            new Error(answer.description),
            answer.description,
          )
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

  private getApiUrl(methodName: string): string {
    return `/${TelegramBaseApi.path}${this.apiToken}/${methodName}`;
  }
}
