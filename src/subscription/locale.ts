import { type LanguageCode } from "../recognition/types.js";

const FREE_LOCALES_ARR: LanguageCode[] = ["en-US", "ru-RU"];

const FREE_LOCALES = new Set(FREE_LOCALES_ARR);

export const isPremiumLocale = (lang: LanguageCode): boolean => {
  return !FREE_LOCALES.has(lang);
};
