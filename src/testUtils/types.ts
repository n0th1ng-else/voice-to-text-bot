import {
  type ChatId,
  TgChatId,
  type MessageId,
  TgMessageId,
  type UpdateId,
  TgUpdateId,
  type CallbackQueryId,
  TgCallbackQueryId,
  type UserId,
  TgUserId,
  type FileId,
  TgFileId,
  type PaymentChargeId,
  TgPaymentChargeId,
} from "../telegram/api/core.js";

export const asChatId__test = (chatId: number): ChatId =>
  TgChatId.parse(chatId);

export const asMessageId__test = (messageId: number): MessageId =>
  TgMessageId.parse(messageId);

export const asUpdateId__test = (updateId: number): UpdateId =>
  TgUpdateId.parse(updateId);

export const asCallbackQueryId__test = (
  callbackQueryId: string,
): CallbackQueryId => TgCallbackQueryId.parse(callbackQueryId);

export const asUserId__test = (userId: number): UserId =>
  TgUserId.parse(userId);

export const asFileId__test = (fileId: string): FileId =>
  TgFileId.parse(fileId);

export const asPaymentChargeId__test = (
  paymentChargeId: string,
): PaymentChargeId => TgPaymentChargeId.parse(paymentChargeId);
