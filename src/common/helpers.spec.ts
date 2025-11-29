import { describe, expect, it } from "vitest";
import { splitTextIntoParts } from "./helpers.js";

describe("common helpers", () => {
  describe("splitTextIntoParts", () => {
    it("should return the array of the same text if it is less than the max size", () => {
      const text = "one two three";
      const maxLength = text.length + 1;
      expect(splitTextIntoParts(text, "en-US", maxLength)).toEqual([text]);
    });

    it("should return the array of the same text if it is equal to the max size", () => {
      const text = "one two three";
      const maxLength = text.length;
      expect(splitTextIntoParts(text, "en-US", maxLength)).toEqual([text]);
    });

    it("should return the parts of the text if the text is longer than max size", () => {
      const text = "one two three";
      const maxLength = 7;
      expect(splitTextIntoParts(text, "en-US", maxLength)).toEqual(["one two", "three"]);
    });

    it("should not return the trailing whitespace in the last part", () => {
      const text = "one two three ";
      const maxLength = text.length - 1;
      expect(splitTextIntoParts(text, "en-US", maxLength)).toEqual(["one two three"]);
    });
  });
});
