import { TelegramBaseApi } from "../core.js";
import { type MessageDto, type TgMessage, TgMessageSchema } from "../../types.js";
import {
  type EditMessageDto,
  type TgMessageOptions,
  TgLeaveChatSchema,
  TgFileSchema,
} from "./chats-types.js";
import type { ChatId, FileId, MessageId, MessageThreadId } from "../../core.js";
import { TgError } from "../../tgerror.js";

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

    return this.client.requestValidate("sendMessage", TgMessageSchema, data, chatId);
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

    return this.client.requestValidate("editMessageText", TgMessageSchema, data, chatId);
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

  public async getFile(fileId: FileId, chatId: ChatId): Promise<string> {
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
      const err = new Error("Unable to get the file link");
      const tgError = new TgError(err, err.message)
        .setUrl(this.client.getApiUrl("getFile"), this.apiToken)
        .setChatId(chatId);
      throw tgError;
    }

    return `${TelegramBaseApi.url}/file/bot${this.apiToken}/${filePath}`;
  }
}
