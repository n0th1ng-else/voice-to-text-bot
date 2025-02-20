import { type TranslationKey, TranslationKeys } from "./types.js";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from "../recognition/types.js";
import {
  initializeMenuLabels,
  initializeTranslationsForLocale,
  type TranslationsFileType,
} from "./translations/loader.js";
import type { BotCommandType } from "../telegram/types.js";

type Translator = {
  getFallbackLanguage: () => LanguageCode;
  menu: (command: BotCommandType) => string;
  t: (
    key: TranslationKey,
    locale: LanguageCode,
    params?: Record<string, string | number>,
  ) => string;
  paidT: (key: TranslationKey, locale: LanguageCode) => string;
};

const TRANSLATION_VARIABLES_PATTERN = /\{\{(.+?)}}/gi;

const initTranslations = (): Translator => {
  const menuLabels = initializeMenuLabels();
  const textRegistry = new Map<LanguageCode, TranslationsFileType>();
  SUPPORTED_LANGUAGES.forEach((locale) => {
    const dictionary = initializeTranslationsForLocale(locale);
    textRegistry.set(locale, dictionary);
  });

  const getFallbackLanguage = (): LanguageCode => DEFAULT_LANGUAGE;

  const getRawTranslation = (
    key: TranslationKey,
    locale: LanguageCode,
  ): string => {
    const currentLocaleStr = textRegistry.get(locale)?.[key];
    const defaultLocaleStr = textRegistry.get(getFallbackLanguage())?.[key];
    const str = currentLocaleStr || defaultLocaleStr || "";
    return str;
  };

  const translate = (
    key: TranslationKey,
    locale: LanguageCode,
    params?: Record<string, string | number>,
  ): string => {
    let str = getRawTranslation(key, locale);

    if (params) {
      str = Object.keys(params).reduce((acc, varKey) => {
        const varValue = params[varKey];
        return acc.replaceAll(`{{${varKey}}}`, String(varValue));
      }, str);
    }

    const missing = str.match(TRANSLATION_VARIABLES_PATTERN);

    if (missing?.length) {
      throw new Error("Missing text interpolation", {
        cause: {
          key,
          missing,
        },
      });
    }

    return str;
  };

  return {
    getFallbackLanguage,
    menu: (command: BotCommandType): string => menuLabels[command],
    t: translate,
    paidT: (key: TranslationKey, locale: LanguageCode): string => {
      const tr = translate(key, locale);
      return `${tr} 🔑`;
    },
  };
};

let translatorSingleton: undefined | Translator = undefined;

export const getTranslator = (): Translator => {
  if (!translatorSingleton) {
    translatorSingleton = initTranslations();
  }

  return translatorSingleton;
};

export const isTranslationKey = (value: unknown): value is TranslationKey => {
  const allTranslationKeys = new Set<string>(Object.values(TranslationKeys));
  const isString = typeof value === "string";
  return isString && allTranslationKeys.has(value);
};
