import { describe, it, expect } from "@jest/globals";
import { getVoiceConverterProvider } from "./index.js";

describe("getVoiceConverterProvider", () => {
  it.each([
    ["WITAI", "WITAI"],
    ["GOOGLE", "GOOGLE"],
    ["AWS", "AWS"],
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
