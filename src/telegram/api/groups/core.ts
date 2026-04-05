import type { z } from "zod";
import type { ApiErrorReflector, TgCore } from "../types.js";
import { TgError } from "../tgerror.js";
import type { ChatId } from "../core.js";
import { API_TIMEOUT_MS } from "../../../const.js";
import { unknownHasMessage } from "../../../common/unknown.js";

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

  private async parseErrorResponse(response: Response): Promise<TgCore<void>> {
    try {
      const answer = (await response.json()) as TgCore<void>;
      return answer;
    } catch {
      return {
        ok: false,
        result: undefined,
      };
    }
  }

  private async request<Response, Data>(
    methodName: string,
    data?: Data,
    chatId?: ChatId,
  ): Promise<Response> {
    const url = this.getApiUrl(methodName);
    const fullUrl = `${TelegramBaseApi.url}${url}`;

    try {
      const headers = new Headers();
      headers.set("Accept", "application/json");
      headers.set("Content-Type", "application/json");
      const response = await fetch(fullUrl, {
        method: "POST",
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(TelegramBaseApi.timeout),
      });

      if (!response.ok) {
        const answer = await this.parseErrorResponse(response);

        const tgError = new TgError(new Error(response.statusText), response.statusText)
          .setUrl(url, this.apiToken)
          .setChatId(chatId)
          .setErrorCode(response.status)
          .setResponse(answer);

        throw tgError;
      }

      const answer = (await response.json()) as TgCore<Response>;
      if (!answer.ok) {
        const tgError = new TgError(new Error(answer.description), answer.description)
          .setUrl(url, this.apiToken)
          .setErrorCode(answer.error_code)
          .setRetryAfter(answer?.parameters?.retry_after)
          .setMigrateToChatId(answer?.parameters?.migrate_to_chat_id)
          .setChatId(chatId);

        throw tgError;
      }

      return answer.result;
    } catch (err) {
      const wrappedErr =
        err instanceof TgError
          ? err
          : new TgError(err, unknownHasMessage(err) ? err.message : undefined)
              .setUrl(url, this.apiToken)
              .setChatId(chatId);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.errorReflector?.(wrappedErr);
      throw wrappedErr;
    }
  }
}
