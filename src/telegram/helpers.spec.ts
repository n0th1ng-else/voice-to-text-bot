import { describe, it, expect } from "vitest";
import { type TgMessage } from "./api/types.js";
import { getUserLanguage, getLanguageByText } from "./helpers.js";
import { DEFAULT_LANGUAGE, type LanguageCode } from "../recognition/types.js";

const getMessage = (name?: string, lang?: string): TgMessage => {
  return {
    message_id: 4324,
    date: new Date().getTime(),
    chat: {
      type: "private",
      id: 23324,
    },
    from: name
      ? {
          first_name: "name",
          id: 4324,
          is_bot: false,
          language_code: lang,
        }
      : undefined,
  };
};
describe("telegram helpers", () => {
  describe("getUserLanguage", () => {
    it("falls back to EN is no from field presented", () => {
      const msg = getMessage();
      const lang = getUserLanguage(msg);
      expect(lang).toBe("en-US");
    });

    it("falls back to EN is no language_code field presented", () => {
      const msg = getMessage("test-name");
      const lang = getUserLanguage(msg);
      expect(lang).toBe("en-US");
    });

    it("returns RU if it eq to ru", () => {
      const msg = getMessage("test-name", "ru");
      const lang = getUserLanguage(msg);
      expect(lang).toBe("ru-RU");
    });

    it("returns RU if it eq to RU", () => {
      const msg = getMessage("test-name", "RU");
      const lang = getUserLanguage(msg);
      expect(lang).toBe("ru-RU");
    });

    it("returns RU if it eq to ru-RU", () => {
      const msg = getMessage("test-name", "ru-RU");
      const lang = getUserLanguage(msg);
      expect(lang).toBe("ru-RU");
    });

    it("returns EN if it eq to es", () => {
      const msg = getMessage("test-name", "es");
      const lang = getUserLanguage(msg);
      expect(lang).toBe("en-US");
    });

    it("returns EN if it eq to dssdfsf", () => {
      const msg = getMessage("test-name", "dssdfsf");
      const lang = getUserLanguage(msg);
      expect(lang).toBe("en-US");
    });

    it("returns EN if it eq to en", () => {
      const msg = getMessage("test-name", "en");
      const lang = getUserLanguage(msg);
      expect(lang).toBe("en-US");
    });

    it("returns EN if it eq to EN", () => {
      const msg = getMessage("test-name", "EN");
      const lang = getUserLanguage(msg);
      expect(lang).toBe("en-US");
    });

    it("returns EN if it eq to en-US", () => {
      const msg = getMessage("test-name", "en-US");
      const lang = getUserLanguage(msg);
      expect(lang).toBe("en-US");
    });

    it("returns EN if it eq to en-GB", () => {
      const msg = getMessage("test-name", "en-GB");
      const lang = getUserLanguage(msg);
      expect(lang).toBe("en-US");
    });
  });

  describe("getLanguageByText", () => {
    it("should return the language if it is supported", () => {
      const supported: LanguageCode[] = ["en-US", "ru-RU"];
      supported.forEach((lng) => {
        expect(getLanguageByText(lng)).toBe(lng);
        expect(getLanguageByText(lng, false)).toBe(lng);
        expect(getLanguageByText(lng, true)).toBe(lng);
      });
    });

    it.each([[""], ["en-GB"], ["es-ES"], ["foo"]])(
      "should return default language if the input was %s and re-throwing errors disabled",
      (lng) => {
        expect(getLanguageByText(lng)).toBe(DEFAULT_LANGUAGE);
        expect(getLanguageByText(lng, false)).toBe(DEFAULT_LANGUAGE);
      },
    );

    it.each([[""], ["en-GB"], ["es-ES"], ["foo"]])(
      "should throw an error if the input was %s and re-throwing errors enabled",
      (lng) => {
        expect(() => getLanguageByText(lng, true)).toThrowError(
          `Language code ${lng} is not recognized`,
        );
      },
    );
  });
});
