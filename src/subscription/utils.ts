import type { ConverterType, LanguageCode } from "../recognition/types.js";
import type { BotMessageModel } from "../telegram/models/botMessage.js";
import type { UserId } from "../telegram/api/core.js";

const FREE_LANGUAGES = new Set<LanguageCode>(["en-US", "ru-RU"]);

export const isPremiumLanguage = (lang: LanguageCode): boolean => {
  return !FREE_LANGUAGES.has(lang);
};

export const getConverterType = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _model: Pick<BotMessageModel, "isGroup" | "userId">,
): ConverterType => {
  // TODO implement
  return "main";
};

/**
 * Subscriptions are **only for direct messages**.
 *
 * Sometimes we only have chatId (in the button callbacks and service messages.
 * In this case we should use chatId as userId (they are the same at this moment)
 *
 */
export const getAsUserId = (model: Pick<BotMessageModel, "userId" | "chatId">): UserId => {
  if (model.userId) {
    return model.userId;
  }
  return model.chatId as unknown as UserId;
};
