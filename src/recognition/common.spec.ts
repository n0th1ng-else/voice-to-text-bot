import { describe, it, expect } from "vitest";
import {
  convertLanguageCodeToISO,
  convertLanguageCodeFromISO,
} from "./common.js";
import { type LanguageCode } from "./types.js";

describe("Language conversion", () => {
  describe("convertLanguageCodeToISO", () => {
    it.each<[string, LanguageCode]>([
      ["en", "en-US"],
      ["ru", "ru-RU"],
    ])("should return %s when the input was %s", (expected, input) => {
      expect(convertLanguageCodeToISO(input)).toEqual(expected);
    });

    it("should throw an error if the language is not supported", () => {
      expect(() =>
        convertLanguageCodeToISO("whatever" as LanguageCode),
      ).toThrowError(/Language not supported/);
    });
  });

  describe("convertLanguageCodeFromISO", () => {
    it.each<[LanguageCode, string]>([
      ["en-US", "en"],
      ["ru-RU", "ru"],
    ])("should return %s when the input was %s", (expected, input) => {
      expect(convertLanguageCodeFromISO(input)).toEqual(expected);
    });

    it("should throw an error if the language is not supported", () => {
      expect(() => convertLanguageCodeFromISO("whatever")).toThrowError(
        /Language not supported/,
      );
    });
  });
});
