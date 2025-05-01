import type { LanguageCode } from "../recognition/types.js";

const FREE_LANGUAGES: readonly LanguageCode[] = ["en-US", "ru-RU"];

export const isPremiumLanguage = (lang: LanguageCode): boolean => {
  return !FREE_LANGUAGES.includes(lang);
};
