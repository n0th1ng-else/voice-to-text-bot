import { Logger } from "../logger/index.js";
import { hasNoRightsToSendMessage, TgError } from "./api/tgerror.js";
import type { ApiErrorReflector } from "./api/types.js";
import type { ChatId } from "./api/core.js";

const logger = new Logger("telegram:reflector");

type ApiErrorReflectorHandlers = {
  leaveChat: (chatId: ChatId) => Promise<boolean>;
};

class ReflectorError extends Error {
  public chatId: ChatId | undefined;
  public isChatLeft: boolean | undefined;

  constructor(message: string, cause?: unknown) {
    super(`ETGREFLECTOR ${message}`, { cause });
  }
}

export const initTgReflector = (api: ApiErrorReflectorHandlers): ApiErrorReflector => {
  const reflect = async (tgErr: unknown): Promise<void> => {
    if (!(tgErr instanceof TgError)) {
      return;
    }

    if (hasNoRightsToSendMessage(tgErr)) {
      if (!tgErr.chatId) {
        logger.error("No chatId provided", tgErr);
        return;
      }

      try {
        const isChatLeft = await api.leaveChat(tgErr.chatId);
        if (isChatLeft) {
          logger.warn("Left the chat", { chatId: tgErr.chatId }, true);
          return;
        }

        const rfErr = new ReflectorError("Tried to leave the chat, receive false as a result");
        rfErr.chatId = tgErr.chatId;
        rfErr.isChatLeft = isChatLeft;
        logger.error(rfErr.message, rfErr);
      } catch (err) {
        const rfErr = new ReflectorError("Failed to leave the chat", err);
        rfErr.chatId = tgErr.chatId;
        logger.error(rfErr.message, rfErr);
      }
    }
  };

  return reflect;
};
