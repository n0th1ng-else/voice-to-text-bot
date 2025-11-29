import { describe, expect, it, vi } from "vitest";
import type { LanguageTokens } from "../types.js";
import { getWitAILanguageTokens } from "./parser.js";

vi.mock("../../logger/index");

const TEST_OLD_TOKENS: LanguageTokens = {
  "en-US": "testEn",
  "ru-RU": "testRu",
};

describe("WitAi language tokens parser", () => {
  it.each([
    [undefined, undefined],
    ["non-json", "foo bar"],
    ["wrong json", JSON.stringify({ foo: "bar" })],
  ])("should fall back to old format is the tokens string is %s", (_label, value) => {
    expect(getWitAILanguageTokens(TEST_OLD_TOKENS, value)).toEqual(TEST_OLD_TOKENS);
  });

  it("should apply the tokens from the v2 format and ignore old ones", () => {
    const v2 = [
      {
        locale: "en-US",
        token: "newEn",
      },
      {
        locale: "ru-RU",
        token: "newRu",
      },
    ];

    const expected = {
      "en-US": "newEn",
      "ru-RU": "newRu",
    };
    expect(getWitAILanguageTokens(TEST_OLD_TOKENS, JSON.stringify(v2))).toEqual(expected);
  });

  it("should throw an error if the token is missing in v2 format", () => {
    const v2 = [
      {
        locale: "en-US",
        token: "newEn",
      },
    ];

    const missingLang = "ru-RU";
    expect(() => getWitAILanguageTokens(TEST_OLD_TOKENS, JSON.stringify(v2))).toThrowError(
      new RegExp(missingLang),
    );
  });

  it("should throw an error if the many tokens are missing in v2 format", () => {
    const missingLang = "en-US,ru-RU";
    expect(() => getWitAILanguageTokens(TEST_OLD_TOKENS, JSON.stringify([]))).toThrowError(
      new RegExp(missingLang),
    );
  });
});
