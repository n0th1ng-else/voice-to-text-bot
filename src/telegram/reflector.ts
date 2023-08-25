import { Logger } from "../logger/index.js";
import { TelegramApi } from "./api/tgapi.js";
import {
  hasNoRightsToSendMessage,
  isKickedFromSupergroup,
  TgError,
} from "./api/tgerror.js";
import { ApiErrorReflector } from "./api/types.js";

const logger = new Logger("telegram:reflector");

export const initTgReflector = (token: string): ApiErrorReflector => {
  const api = new TelegramApi(token);
  const reflect = async (err: unknown): Promise<void> => {
    if (!(err instanceof TgError)) {
      return;
    }

    if (hasNoRightsToSendMessage(err) || isKickedFromSupergroup(err)) {
      if (!err.chatId) {
        logger.error("No chatId provided", err);
        return;
      }

      return api
        .leaveChat(err.chatId)
        .then((chatLeft) => {
          const logData = {
            chatId: err.chatId,
            reason: "hasNoRightsToSendMessage",
          };

          if (chatLeft) {
            logger.warn("Left the chat", logData);
            return;
          }

          logger.error(
            "Tried to leave the chat, receive false as a result",
            logData,
          );
        })
        .catch((error: unknown) => {
          logger.error("Failed to leave the chat", {
            chatId: err.chatId,
            error,
          });
        });
    }
  };

  return reflect;
};
