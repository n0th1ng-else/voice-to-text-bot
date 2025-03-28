import { TelegramBaseApi } from "../core.js";
import { type MessageDto, type TgMessage } from "../../types.js";
import {
  type EditMessageDto,
  type TgMessageOptions,
  TgLeaveChatSchema,
  TgFileSchema,
  type TgFileResult,
} from "./chats-types.js";
import type { ChatId, MessageId, MessageThreadId } from "../../core.js";

export class TelegramChatsApi {
  private readonly client: TelegramBaseApi;
  private readonly apiToken: string;

  constructor(client: TelegramBaseApi, apiToken: string) {
    this.client = client;
    this.apiToken = apiToken;
  }

  public sendMessage(
    chatId: ChatId,
    text: string,
    options: TgMessageOptions = {},
    forumThreadId?: MessageThreadId,
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

    return this.client.request<TgMessage, MessageDto>(
      "sendMessage",
      data,
      chatId,
    );
  }

  public editMessageText(
    chatId: ChatId,
    messageId: MessageId,
    text: string,
    options: TgMessageOptions = {},
  ): Promise<TgMessage> {
    const data: EditMessageDto = {
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

    return this.client.request<TgMessage, EditMessageDto>(
      "editMessageText",
      data,
      chatId,
    );
  }

  public leaveChat(chatId: ChatId): Promise<boolean> {
    return this.client.requestValidate(
      "leaveChat",
      TgLeaveChatSchema,
      {
        chat_id: chatId,
      },
      chatId,
    );
  }

  public async getFile(fileId: string, chatId: ChatId): Promise<TgFileResult> {
    const data = await this.client.requestValidate(
      "getFile",
      TgFileSchema,
      {
        file_id: fileId,
      },
      chatId,
    );

    const filePath = data.file_path;
    if (!filePath) {
      return Promise.reject(new Error("ETELEGRAM Unable to get the file link"));
    }

    return {
      fileUrl: `${TelegramBaseApi.url}/file/bot${this.apiToken}/${filePath}`,
      fileName: filePath.split("/").at(-1) ?? "file.ogg",
      fileId: data.file_id,
    };
  }
}
