import axios, { type AxiosError, type AxiosInstance } from "axios";
import { type z } from "zod";
import {
  type ApiErrorReflector,
  type BotCommandDto,
  type BotCommandListDto,
  type EditMessageDto,
  type FileDto,
  type InvoiceDto,
  type MessageDto,
  type PreCheckoutQueryDto,
  type TgCore,
  type TgFile,
  type TgInvoice,
  TgLeaveChatSchema,
  type TgMessage,
  type TgMessageOptions,
  TgSetWebHookSchema,
  type TgWebHook,
  TgWebHookSchema,
} from "./types.js";
import { TgError } from "./tgerror.js";

export const TELEGRAM_API_MAX_MESSAGE_SIZE = 4096;

export class TelegramApi {
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
      baseURL: TelegramApi.url,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: TelegramApi.timeout,
      responseType: "json",
    });
  }

  public setWebHook(hookUrl: string): Promise<boolean> {
    return this.requestValidate("setWebHook", TgSetWebHookSchema, {
      url: hookUrl,
    });
  }

  public setMyCommands(commands: BotCommandDto[]): Promise<boolean> {
    return this.request<boolean, BotCommandListDto>("setMyCommands", {
      commands,
    });
  }

  public getWebHookInfo(): Promise<TgWebHook> {
    return this.requestValidate("getWebhookInfo", TgWebHookSchema);
  }

  public getFileLink(fileId: string): Promise<string> {
    return this.request<TgFile, FileDto>("getFile", { file_id: fileId }).then(
      (data) => {
        const filePath = data.file_path;
        if (!filePath) {
          return Promise.reject(
            new Error("ETELEGRAM Unable to get the file link"),
          );
        }

        return `${TelegramApi.url}/file/bot${this.apiToken}/${filePath}`;
      },
    );
  }

  public sendMessage(
    chatId: number,
    text: string,
    options: TgMessageOptions = {},
    forumThreadId?: number,
  ): Promise<TgMessage> {
    const data: MessageDto = {
      text,
      chat_id: chatId,
    };

    if (forumThreadId) {
      data.message_thread_id = forumThreadId;
    }

    if (!options.disableMarkup) {
      data.parse_mode = "HTML";
    }

    if (options.buttons) {
      data.reply_markup = {
        inline_keyboard: options.buttons,
      };
    }

    return this.request<TgMessage, MessageDto>("sendMessage", data, chatId);
  }

  public editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    options: TgMessageOptions = {},
  ): Promise<TgMessage> {
    const data: MessageDto = {
      text,
      chat_id: chatId,
      message_id: messageId,
    };

    if (!options.disableMarkup) {
      data.parse_mode = "HTML";
    }

    if (options.buttons) {
      data.reply_markup = {
        inline_keyboard: options.buttons,
      };
    }

    return this.request<TgMessage, EditMessageDto>(
      "editMessageText",
      data,
      chatId,
    );
  }

  public answerPreCheckoutQuery(
    queryId: string,
    error?: string,
  ): Promise<TgMessage> {
    const data: PreCheckoutQueryDto = {
      pre_checkout_query_id: queryId,
      ok: !error,
      error_message: error,
    };
    return this.request<TgMessage, PreCheckoutQueryDto>(
      "answerPreCheckoutQuery",
      data,
    );
  }

  public sendInvoice(opts: TgInvoice): Promise<TgMessage> {
    const data: InvoiceDto = {
      chat_id: opts.chatId,
      currency: "EUR",
      title: opts.title,
      description: opts.description,
      payload: opts.payload,
      prices: [
        {
          label: opts.label,
          amount: opts.amount,
        },
      ],
      provider_token: opts.token,
      start_parameter: opts.meta,
      photo_url: opts.photo.url,
      photo_width: opts.photo.width,
      photo_height: opts.photo.height,
    };

    if (opts.forumThreadId) {
      data.message_thread_id = opts.forumThreadId;
    }

    return this.request<TgMessage, InvoiceDto>(
      "sendInvoice",
      data,
      opts.chatId,
    );
  }

  public leaveChat(chatId: number) {
    return this.requestValidate(
      "leaveChat",
      TgLeaveChatSchema,
      {
        chat_id: chatId,
      },
      chatId,
    );
  }

  private requestValidate<
    Output,
    Def extends z.ZodTypeDef = z.ZodTypeDef,
    Input = Output,
    Data = unknown,
  >(
    methodName: string,
    schema: z.ZodType<Output, Def, Input>,
    data?: Data,
    chatId?: number,
  ): Promise<z.infer<z.ZodType<Output, Def, Input>>> {
    return this.request(methodName, data, chatId).then((result) => {
      return schema.parse(result);
    });
  }

  private request<Response, Data>(
    methodName: string,
    data?: Data,
    chatId?: number,
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
    return `/${TelegramApi.path}${this.apiToken}/${methodName}`;
  }
}
