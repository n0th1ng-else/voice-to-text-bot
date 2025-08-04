import { expect, describe, it } from "vitest";
import { getAsUserId, isPremiumLanguage } from "./utils.js";
import { asChatId__test, asUserId__test } from "../testUtils/types.js";
import type { LanguageCode } from "../recognition/types.js";

describe("subscription utils", () => {
  describe("isPremiumLanguage", () => {
    it.each<[LanguageCode, string, boolean]>([
      ["en-US", " not", false],
      ["ru-RU", " not", false],
    ])("%s is%s a premium language", (lng, _label, result) => {
      expect(isPremiumLanguage(lng)).toEqual(result);
    });
  });

  describe("getAsUserId", () => {
    it("should use userId instead of chatId", () => {
      const userId = asUserId__test(423424);
      expect(
        getAsUserId({
          chatId: asChatId__test(131333),
          userId,
        }),
      ).toEqual(userId);
    });

    it("should use chatId if userId is not defined", () => {
      const chatId = asChatId__test(131333);
      expect(
        getAsUserId({
          chatId,
        }),
      ).toEqual(chatId);
    });
  });
});
