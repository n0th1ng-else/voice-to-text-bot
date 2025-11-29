import { describe, it, expect } from "vitest";
import { sSuffix, getSupportedAudioFormats, getMaxDuration, toCurrency } from "./utils.js";

describe("text/utils", () => {
  describe("sSuffix", () => {
    it("should keep the word unmodified if the condition is false", () => {
      const msg = "test";
      expect(sSuffix(msg, false)).toBe(msg);
    });

    it("should keep the word unmodified if the condition is 1", () => {
      const msg = "test";
      expect(sSuffix(msg, 1)).toBe(`1 ${msg}`);
    });

    it.each([[-2], [0], [2], [10]])(
      "should pluralize the word if the condition is %s",
      (condition) => {
        const msg = "test";
        expect(sSuffix(msg, condition)).toBe(`${condition} ${msg}s`);
      },
    );

    it("should pluralize the word if the condition is true", () => {
      const msg = "test";
      expect(sSuffix(msg, true)).toBe(`${msg}s`);
    });
  });

  describe("getSupportedAudioFormats", () => {
    it("should properly format the output", () => {
      expect(
        getSupportedAudioFormats([
          {
            mimeType: "audio/ogg",
            ext: "ogg",
          },
        ]),
      ).toBe("*.ogg");
    });

    it("should properly format two extensions", () => {
      expect(
        getSupportedAudioFormats([
          {
            mimeType: "audio/ogg",
            ext: "ogg",
          },
          {
            mimeType: "audio/mp3",
            ext: "mp3",
          },
        ]),
      ).toBe("*.ogg, *.mp3");
    });

    it("should remove duplicates", () => {
      expect(
        getSupportedAudioFormats([
          {
            mimeType: "audio/ogg",
            ext: "ogg",
          },
          {
            mimeType: "audio/opus",
            ext: "ogg",
          },
        ]),
      ).toBe("*.ogg");
    });

    it("should use default extensions", () => {
      expect(getSupportedAudioFormats()).toBe("*.ogg, *.opus, *.m4a");
    });
  });

  describe("getMaxDuration", () => {
    it("should return seconds if max is less than 1min", () => {
      expect(getMaxDuration(47)).toEqual([0, 47]);
    });

    it("should return only minutes if no seconds left", () => {
      expect(getMaxDuration(120)).toEqual([2, 0]);
    });

    it("should return full time", () => {
      expect(getMaxDuration(187)).toEqual([3, 7]);
    });
  });

  describe("toCurrency", () => {
    it("should show the amount in euro", () => {
      expect(toCurrency(123)).toBe("123€");
    });

    it("should show the amount in euro with note", () => {
      expect(toCurrency(81230, "test")).toBe("81230€  test");
    });
  });
});
