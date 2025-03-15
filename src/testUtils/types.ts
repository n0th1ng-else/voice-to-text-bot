import type { ChatId, MessageId } from "../telegram/api/core.js";

export const asChatId__test = (chatId: number): ChatId => chatId as ChatId;

export const asMessageId__test = (messageId: number): MessageId =>
  messageId as MessageId;
