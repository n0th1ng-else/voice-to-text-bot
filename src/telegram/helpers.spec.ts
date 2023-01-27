import { describe, it, expect } from "@jest/globals";
import { TgChatType, TgMessage } from "./api/types.js";
import { getUserLanguage } from "./helpers.js";
import { LanguageCode } from "../recognition/types.js";

const getMessage = (name?: string, lang?: string): TgMessage => {
  return {
    message_id: 4324,
    date: new Date().getTime(),
    chat: {
      type: TgChatType.Private,
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
      expect(lang).toBe(LanguageCode.En);
    });

    it("falls back to EN is no language_code field presented", () => {
      const msg = getMessage("test-name");
      const lang = getUserLanguage(msg);
      expect(lang).toBe(LanguageCode.En);
    });

    it("returns RU if it eq to ru", () => {
      const msg = getMessage("test-name", "ru");
      const lang = getUserLanguage(msg);
      expect(lang).toBe(LanguageCode.Ru);
    });

    it("returns RU if it eq to RU", () => {
      const msg = getMessage("test-name", "RU");
      const lang = getUserLanguage(msg);
      expect(lang).toBe(LanguageCode.Ru);
    });

    it("returns RU if it eq to ru-RU", () => {
      const msg = getMessage("test-name", "ru-RU");
      const lang = getUserLanguage(msg);
      expect(lang).toBe(LanguageCode.Ru);
    });

    it("returns EN if it eq to es", () => {
      const msg = getMessage("test-name", "es");
      const lang = getUserLanguage(msg);
      expect(lang).toBe(LanguageCode.En);
    });

    it("returns EN if it eq to dssdfsf", () => {
      const msg = getMessage("test-name", "dssdfsf");
      const lang = getUserLanguage(msg);
      expect(lang).toBe(LanguageCode.En);
    });

    it("returns EN if it eq to en", () => {
      const msg = getMessage("test-name", "en");
      const lang = getUserLanguage(msg);
      expect(lang).toBe(LanguageCode.En);
    });

    it("returns EN if it eq to EN", () => {
      const msg = getMessage("test-name", "EN");
      const lang = getUserLanguage(msg);
      expect(lang).toBe(LanguageCode.En);
    });

    it("returns EN if it eq to en-US", () => {
      const msg = getMessage("test-name", "en-US");
      const lang = getUserLanguage(msg);
      expect(lang).toBe(LanguageCode.En);
    });

    it("returns EN if it eq to en-GB", () => {
      const msg = getMessage("test-name", "en-GB");
      const lang = getUserLanguage(msg);
      expect(lang).toBe(LanguageCode.En);
    });
  });
});
