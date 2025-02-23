import { getSubscriptionFromCache } from "./subscriptions.js";
import type { ConverterType, LanguageCode } from "../recognition/types.js";
import type { BotMessageModel } from "../telegram/model.js";
import type { UserId } from "../telegram/api/core.js";

const FREE_LANGUAGES: readonly LanguageCode[] = ["en-US", "ru-RU"];

export const isPremiumLanguage = (lang: LanguageCode): boolean => {
  return !FREE_LANGUAGES.includes(lang);
};

export const getConverterType = (
  model: Pick<BotMessageModel, "isGroup" | "userId">,
): ConverterType => {
  if (model.isGroup) {
    // TODO we only support direct messages for now
    return "main";
  }

  if (!model.userId) {
    return "main";
  }
  const userSubscription = getSubscriptionFromCache(model.userId);
  const converterType: ConverterType = userSubscription ? "advanced" : "main";
  return converterType;
};

/**
 * Subscriptions are **only for direct messages**.
 *
 * Sometimes we only have chatId (in the button callbacks and service messages.
 * In this case we should use chatId as userId (they are the same at this moment)
 *
 */
export const getAsUserId = (
  model: Pick<BotMessageModel, "userId" | "chatId">,
): UserId => {
  if (model.userId) {
    return model.userId;
  }
  return model.chatId as unknown as UserId;
};
