import axios, { AxiosError, AxiosInstance } from "axios";
import {
  BotCommandDto,
  BotCommandListDto,
  EditMessageDto,
  FileDto,
  InvoiceDto,
  MessageDto,
  PreCheckoutQueryDto,
  TgCore,
  TgError,
  TgFile,
  TgInlineKeyboardButton,
  TgMessage,
  TgWebHook,
} from "./types";

export class TelegramApi {
  public static readonly url = "https://api.telegram.org";
  public static readonly timeout = 60_000;

  private static readonly path = "bot";

  private readonly client: AxiosInstance;

  constructor(private readonly apiToken: string) {
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
    return this.request<boolean, TgWebHook>("setWebHook", { url: hookUrl });
  }

  public setMyCommands(commands: BotCommandDto[]): Promise<boolean> {
    return this.request<boolean, BotCommandListDto>("setMyCommands", {
      commands,
    });
  }

  public getWebHookInfo(): Promise<TgWebHook> {
    return this.request<TgWebHook, void>("getWebhookInfo");
  }

  public getFileLink(fileId: string): Promise<string> {
    return this.request<TgFile, FileDto>("getFile", { file_id: fileId }).then(
      (data) => {
        const filePath = data.file_path;
        if (!filePath) {
          return Promise.reject(
            new Error("ETELEGRAM Unable to get the file link")
          );
        }

        return `${TelegramApi.url}/file/bot${this.apiToken}/${filePath}`;
      }
    );
  }

  public sendMessage(
    chatId: number,
    text: string,
    options: {
      buttons?: TgInlineKeyboardButton[][];
      disableMarkup?: boolean;
    } = {},
    forumThreadId?: number
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

    return this.request<TgMessage, MessageDto>("sendMessage", data);
  }

  public editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    options: {
      buttons?: TgInlineKeyboardButton[][];
      disableMarkup?: boolean;
    } = {}
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

    return this.request<TgMessage, EditMessageDto>("editMessageText", data);
  }

  public answerPreCheckoutQuery(
    queryId: string,
    error?: string
  ): Promise<TgMessage> {
    const data: PreCheckoutQueryDto = {
      pre_checkout_query_id: queryId,
      ok: !error,
      error_message: error,
    };
    return this.request<TgMessage, PreCheckoutQueryDto>(
      "answerPreCheckoutQuery",
      data
    );
  }

  public sendInvoice(
    chatId: number,
    amount: number,
    meta: string,
    token: string,
    title: string,
    description: string,
    label: string,
    payload: string,
    photo: {
      url: string;
      height: number;
      width: number;
    },
    forumThreadId?: number
  ): Promise<TgMessage> {
    const data: InvoiceDto = {
      chat_id: chatId,
      currency: "EUR",
      title,
      description,
      payload: payload,
      prices: [
        {
          label: label,
          amount: amount,
        },
      ],
      provider_token: token,
      start_parameter: meta,
      photo_url: photo.url,
      photo_width: photo.width,
      photo_height: photo.height,
    };

    if (forumThreadId) {
      data.message_thread_id = forumThreadId;
    }

    return this.request<TgMessage, InvoiceDto>("sendInvoice", data);
  }

  private request<Response, Data>(
    methodName: string,
    data?: Data
  ): Promise<Response> {
    const url = this.getApiUrl(methodName);
    return this.client.request<TgCore<Response>>({ url, data }).then(
      (response) => {
        const answer = response.data;
        if (!answer.ok) {
          return Promise.reject(
            new TgError(answer.description)
              .setUrl(url)
              .setErrorCode(answer.error_code)
              .setRetryAfter(answer?.parameters?.retry_after)
              .setMigrateToChatId(answer?.parameters?.migrate_to_chat_id)
          );
        }

        return answer.result;
      },
      (err: AxiosError<TgCore<void>>) => {
        throw new TgError(err.message, err.stack)
          .setUrl(url)
          .setErrorCode(err?.response?.status)
          .setResponse(err?.response?.data);
      }
    );
  }

  private getApiUrl(methodName: string): string {
    return `/${TelegramApi.path}${this.apiToken}/${methodName}`;
  }
}
