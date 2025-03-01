import { describe, it, expect, beforeEach, vi } from "vitest";
import { TranslationKeys } from "./types.js";
import {
  injectDependencies,
  type InjectedFn,
} from "../testUtils/dependencies.js";

vi.mock("./translations/loader");

let isTranslationKey: InjectedFn["isTranslationKey"];
let getTranslator: InjectedFn["getTranslator"];
let BotCommand: InjectedFn["BotCommand"];
let initializeMenuLabels: InjectedFn["initializeMenuLabels"];
let initializeTranslationsForLocale: InjectedFn["initializeTranslationsForLocale"];

let TEST_TRANSLATOR: ReturnType<InjectedFn["getTranslator"]>;

describe("text.index", () => {
  beforeEach(async () => {
    const init = await injectDependencies();
    isTranslationKey = init.isTranslationKey;
    getTranslator = init.getTranslator;
    BotCommand = init.BotCommand;
    initializeMenuLabels = init.initializeMenuLabels;
    initializeTranslationsForLocale = init.initializeTranslationsForLocale;
  });

  describe("isTranslationKey", () => {
    it("should return true if the value is proper translation key", () => {
      expect(
        isTranslationKey(TranslationKeys.AudioNotSupportedMessage),
      ).toEqual(true);
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
      TEST_TRANSLATOR = getTranslator();
    });

    it("should return the getFallbackLanguage api", () => {
      expect(TEST_TRANSLATOR.getFallbackLanguage()).toEqual("en-US");
    });

    it("should return menu translations api", () => {
      expect(TEST_TRANSLATOR.menu(BotCommand.Start)).toEqual("Command text");
    });

    it("should return translation api", () => {
      expect(TEST_TRANSLATOR.t("start.welcomeMessage", "en-US")).toEqual(
        "translation text",
      );
    });

    it("should not re-initialize the instance (singleton)", () => {
      TEST_TRANSLATOR = getTranslator();
      expect(initializeMenuLabels).toHaveBeenCalledTimes(1);
      expect(initializeTranslationsForLocale).toHaveBeenCalledTimes(2); // Two languages supported
    });

    describe("interpolation", () => {
      it("should interpolate the {{var}} with the params array", () => {
        const formatsInterpolation = "any kind of file";
        const text = TEST_TRANSLATOR.t(
          "recognition.voice.supportedFormats",
          "en-US",
          {
            formats: formatsInterpolation,
          },
        );
        expect(text).toEqual(formatsInterpolation);
      });

      it("should interpolate all variables", () => {
        const text = TEST_TRANSLATOR.t(
          "recognition.voice.time.minutes",
          "en-US",
          {
            minutes: 7,
            seconds: 21,
          },
        );
        expect(text).toEqual("7 min 21 sec");
      });

      it("should throw an Error is the is a variable missing", () => {
        expect(() =>
          TEST_TRANSLATOR.t("recognition.voice.time.minutes", "en-US", {
            minutes: 7,
            // missing `seconds`
          }),
        ).toThrowError(/Missing text interpolation/);
      });
    });
  });
});
