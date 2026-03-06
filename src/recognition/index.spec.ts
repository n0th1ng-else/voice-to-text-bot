import { describe, it, expect } from "vitest";
import { getVoiceProviders } from "./index.js";

describe("recognition.index", () => {
  describe("getVoiceProviders", () => {
    it("should return the provided providers when they are valid", () => {
      const env = { main: "GOOGLE", advanced: "WHISPER" };
      const result = getVoiceProviders(env);
      expect(result).toEqual({ main: "GOOGLE", advanced: "WHISPER" });
    });

    it("should return the fallback providers when the provided ones are invalid", () => {
      const env = { main: "INVALID", advanced: "UNKNOWN" };
      const result = getVoiceProviders(env);
      expect(result).toEqual({ main: "WITAI", advanced: "11LABS" });
    });

    it("should return the valid provider and fallback for the invalid one pt1", () => {
      const env = { main: "AWS", advanced: "INVALID" };
      const result = getVoiceProviders(env);
      expect(result).toEqual({ main: "AWS", advanced: "11LABS" });
    });

    it("should return the valid provider and fallback for the invalid one pt2", () => {
      const env = { main: "INVALID", advanced: "AWS" };
      const result = getVoiceProviders(env);
      expect(result).toEqual({ main: "WITAI", advanced: "AWS" });
    });
  });
});
