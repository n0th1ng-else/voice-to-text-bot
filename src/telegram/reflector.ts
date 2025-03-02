import { Logger } from "../logger/index.js";
import { TelegramApi } from "./api/tgapi.js";
import { hasNoRightsToSendMessage, TgError } from "./api/tgerror.js";
import { type ApiErrorReflector } from "./api/types.js";

const logger = new Logger("telegram:reflector");

class ReflectorError extends Error {
  public chatId: number | undefined;
  public isChatLeft: boolean | undefined;

  constructor(message: string, cause?: unknown) {
    super(`ETGREFLECTOR ${message}`, { cause });
  }
}

export const initTgReflector = (token: string): ApiErrorReflector => {
  const api = new TelegramApi(token);
  const reflect = async (err: unknown): Promise<void> => {
    if (!(err instanceof TgError)) {
      return;
    }

    if (hasNoRightsToSendMessage(err)) {
      if (!err.chatId) {
        logger.error("No chatId provided", err);
        return;
      }

      return api.chats
        .leaveChat(err.chatId)
        .then((isChatLeft) => {
          if (isChatLeft) {
            logger.warn("Left the chat", { chatId: err.chatId });
            return;
          }

          const rfErr = new ReflectorError(
            "Tried to leave the chat, receive false as a result",
          );
          rfErr.chatId = err.chatId;
          rfErr.isChatLeft = isChatLeft;
          logger.error(rfErr.message, rfErr);
        })
        .catch((error: unknown) => {
          const rfErr = new ReflectorError("Failed to leave the chat", error);
          rfErr.chatId = err.chatId;
          logger.error(rfErr.message, rfErr);
        });
    }
  };

  return reflect;
};
