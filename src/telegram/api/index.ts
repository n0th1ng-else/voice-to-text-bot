import axios, { AxiosError, AxiosInstance } from "axios";
import {
  BotCommandDto,
  BotCommandListDto,
  EditMessageDto,
  FileDto,
  MessageDto,
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
    buttons?: TgInlineKeyboardButton[][]
  ): Promise<TgMessage> {
    const data: MessageDto = {
      text,
      chat_id: chatId,
    };

    if (buttons) {
      data.reply_markup = {
        inline_keyboard: buttons,
      };
    }

    return this.request<TgMessage, MessageDto>("sendMessage", data);
  }

  public editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    buttons?: TgInlineKeyboardButton[][]
  ): Promise<TgMessage> {
    const data: MessageDto = {
      text,
      chat_id: chatId,
      message_id: messageId,
    };

    if (buttons) {
      data.reply_markup = {
        inline_keyboard: buttons,
      };
    }

    return this.request<TgMessage, EditMessageDto>("editMessageText", data);
  }

  private request<Response, Data>(
    methodName: string,
    data?: Data
  ): Promise<Response> {
    const url = this.getApiUrl(methodName);
    return this.client
      .request<TgCore<Response>>({ url, data })
      .then(
        (response) => {
          const answer = response.data;
          if (!answer.ok) {
            return Promise.reject(
              new TgError(answer.description)
                .setUrl(url)
                .setErrorCode(answer.error_code)
                .setRetryAfter(
                  answer.parameters && answer.parameters.retry_after
                )
                .setMigrateToChatId(
                  answer.parameters && answer.parameters.migrate_to_chat_id
                )
            );
          }

          return answer.result;
        },
        (err: AxiosError<string>) => {
          throw new TgError(err.message, err.stack)
            .setUrl(url)
            .setErrorCode(err.response && err.response.status)
            .setResponse(err.response && err.response.data);
        }
      );
  }

  private getApiUrl(methodName: string): string {
    return `/${TelegramApi.path}${this.apiToken}/${methodName}`;
  }
}
