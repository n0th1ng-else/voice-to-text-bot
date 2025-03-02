import { type LanguageCode } from "./types.js";

export type ISOLanguage = "en" | "ru";
/**
 * Converts Internal language code into ISO-639-1 code
 */
export const convertLanguageCodeToISO = (lang: LanguageCode): ISOLanguage => {
  switch (lang) {
    case "en-US":
      return "en";
    case "ru-RU":
      return "ru";
    default:
      throw new Error("Language not supported");
  }
};

/**
 * Converts ISO-639-1 code into Internal language code into
 */
export const convertLanguageCodeFromISO = (lang: string): LanguageCode => {
  switch (lang) {
    case "en":
      return "en-US";
    case "ru":
      return "ru-RU";
    default:
      throw new Error("Language not supported");
  }
};
