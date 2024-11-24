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
import { getMaxDuration, getSupportedAudioFormats } from "./utils.js";

type Translator = {
  getFallbackLanguage: () => LanguageCode;
  menu: (command: BotCommandType) => string;
  t: (key: TranslationKey, locale: LanguageCode) => string;
};

const initTranslations = (): Translator => {
  const menuLabels = initializeMenuLabels();
  const textRegistry = new Map<LanguageCode, TranslationsFileType>();
  SUPPORTED_LANGUAGES.forEach((locale) => {
    const dictionary = initializeTranslationsForLocale(locale);
    textRegistry.set(locale, dictionary);
  });

  const supportedAudioFormats = getSupportedAudioFormats();
  const maxVoiceDuration = getMaxDuration();
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

  return {
    getFallbackLanguage,
    menu: (command: BotCommandType): string => menuLabels[command],
    t: (key: TranslationKey, locale: LanguageCode): string => {
      const str = getRawTranslation(key, locale);

      if (str.includes("{{formats}}")) {
        return str.replace("{{formats}}", supportedAudioFormats);
      }

      if (str.includes("{{duration}}")) {
        const minutesRaw = getRawTranslation(
          TranslationKeys.FormattedTimeMinutes,
          locale,
        );
        const secondsRaw = getRawTranslation(
          TranslationKeys.FormattedTimeSeconds,
          locale,
        );

        const [min, sec] = maxVoiceDuration;
        const minutes =
          min > 0 ? minutesRaw.replace("{{minutes}}", String(min)) : "";
        const seconds =
          sec > 0 ? secondsRaw.replace("{{seconds}}", String(sec)) : "";
        const duration = [minutes, seconds].filter(Boolean).join(" ");
        return str.replace("{{duration}}", duration);
      }

      return str;
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
