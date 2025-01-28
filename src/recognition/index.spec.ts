import { describe, it, expect } from "vitest";
import { getVoiceConverterProvider } from "./index.ts";

describe("getVoiceConverterProvider", () => {
  it.each([
    ["WITAI", "WITAI"],
    ["GOOGLE", "GOOGLE"],
    ["AWS", "AWS"],
    ["WHISPER", "WHISPER"],
    [undefined, "WITAI"],
    [42, "WITAI"],
    ["WRONG-STRING", "WITAI"],
  ])(
    "should correctly infer the provider name from $0 and result in $1",
    (input, output) => {
      // @ts-expect-error we test everything that can fall into process.env
      expect(getVoiceConverterProvider(input)).toBe(output);
    },
  );
});
