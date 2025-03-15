import {
  type ChatId,
  TgChatId,
  type MessageId,
  TgMessageId,
  type UpdateId,
  TgUpdateId,
} from "../telegram/api/core.js";

export const asChatId__test = (chatId: number): ChatId =>
  TgChatId.parse(chatId);

export const asMessageId__test = (messageId: number): MessageId =>
  TgMessageId.parse(messageId);

export const asUpdateId__test = (updateId: number): UpdateId =>
  TgUpdateId.parse(updateId);
