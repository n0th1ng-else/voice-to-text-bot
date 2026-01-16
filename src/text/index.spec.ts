import { describe, it, expect, beforeEach, vi } from "vitest";
import { TranslationKeys } from "./types.js";
import { getTranslator, isTranslationKey } from "./index.js";
import { BotCommand } from "../telegram/commands.js";
import { initializeMenuLabels, initializeTranslationsForLocale } from "./translations/loader.js";

vi.mock("./translations/loader");

let testTranslator: ReturnType<typeof getTranslator>;

describe("text.index", () => {
  describe("isTranslationKey", () => {
    it("should return true if the value is proper translation key", () => {
      expect(isTranslationKey(TranslationKeys.AudioNotSupportedMessage)).toEqual(true);
    });

    it.each([
      ["non-translation key string", "weird string"],
      ["boolean", true],
    ])("should return false if the value is %s", (_, value) => {
      expect(isTranslationKey(value)).toEqual(false);
    });
  });

  describe("getTranslator", () => {
    beforeEach(() => {
      testTranslator = getTranslator();
    });

    it("should return the getFallbackLanguage api", () => {
      expect(testTranslator.getFallbackLanguage()).toEqual("en-US");
    });

    it("should return menu translations api", () => {
      expect(testTranslator.menu(BotCommand.Start)).toEqual("Command text");
    });

    it("should return translation api", () => {
      expect(testTranslator.t("start.welcomeMessage", "en-US")).toEqual("translation text");
    });

    it("should not re-initialize the instance (singleton)", () => {
      testTranslator = getTranslator();
      expect(initializeMenuLabels).toHaveBeenCalledTimes(1);
      expect(initializeTranslationsForLocale).toHaveBeenCalledTimes(2); // Two languages supported
    });

    describe("interpolation", () => {
      it("should interpolate the {{var}} with the params array", () => {
        const formatsInterpolation = "any kind of file";
        const text = testTranslator.t("recognition.voice.supportedFormats", "en-US", {
          formats: formatsInterpolation,
        });
        expect(text).toEqual(formatsInterpolation);
      });

      it("should interpolate all variables", () => {
        const text = testTranslator.t("recognition.voice.time.minutes", "en-US", {
          minutes: 7,
          seconds: 21,
        });
        expect(text).toEqual("7 min 21 sec");
      });

      it("should throw an Error is the is a variable missing", () => {
        expect(() =>
          testTranslator.t("recognition.voice.time.minutes", "en-US", {
            minutes: 7,
            // missing `seconds`
          }),
        ).toThrowError(/Missing text interpolation/);
      });
    });
  });
});
