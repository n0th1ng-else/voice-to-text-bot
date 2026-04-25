import { describe, it, expect } from "vitest";
import {
  APIVoiceConverterError,
  getReportedDurationSec,
  isVoiceTooLongError,
} from "./apiSelfHostError.js";

describe("apiSelfHostError", () => {
  describe("APIVoiceConverterError", () => {
    it("should construct with default values", () => {
      const cause = new Error("original");
      const err = new APIVoiceConverterError(cause);

      expect(err.cause).toBe(cause);
      expect(err.message).toBe("EAPICONVERTER Request was unsuccessful");
      expect(err.code).toBe(0);
      expect(err.response).toBe(undefined);
      expect(err.url).toBe("");
    });

    it("should construct with a custom message", () => {
      const cause = new Error("original");
      const msg = "ooops";
      const err = new APIVoiceConverterError(cause, msg);

      expect(err.cause).toBe(cause);
      expect(err.message).toBe(`EAPICONVERTER ${msg}`);
    });

    it("should set the response code", () => {
      const err = new APIVoiceConverterError(new Error("x")).setResponseCode(413);
      expect(err.code).toBe(413);
    });

    it("should set the response body", () => {
      const body = '{"foo":"bar"}';
      const err = new APIVoiceConverterError(new Error("x")).setResponse(body);
      expect(err.response).toBe(body);
    });

    it("should set the url", () => {
      const url = "https://example.com";
      const err = new APIVoiceConverterError(new Error("x")).setUrl(url);
      expect(err.url).toBe(url);
    });
  });

  describe("isVoiceTooLongError", () => {
    it("should return true for an APIVoiceConverterError with code 413", () => {
      const err = new APIVoiceConverterError(new Error("x")).setResponseCode(413);
      expect(isVoiceTooLongError(err)).toBe(true);
    });

    it.each([0, 400, 404, 500])(
      "should return false for an APIVoiceConverterError with code %s",
      (code) => {
        const err = new APIVoiceConverterError(new Error("x")).setResponseCode(code);
        expect(isVoiceTooLongError(err)).toBe(false);
      },
    );

    it("should return false for a non-APIVoiceConverterError error with a 413 code property", () => {
      const err = Object.assign(new Error("x"), { code: 413 });
      expect(isVoiceTooLongError(err)).toBe(false);
    });
  });

  describe("getReportedDurationSec", () => {
    it("should return the duration when the response contains duration_seconds", () => {
      const expected = 45.2;
      const err = new APIVoiceConverterError(new Error("x")).setResponseCode(413).setResponse(
        JSON.stringify({
          error: "Audio too long",
          duration_seconds: expected,
          max_duration_seconds: 30,
        }),
      );

      expect(getReportedDurationSec(err)).toBe(expected);
    });

    it("should return 0 when the response is not set", () => {
      const err = new APIVoiceConverterError(new Error("x"));
      expect(getReportedDurationSec(err)).toBe(0);
    });

    it("should return 0 when the response is an empty string", () => {
      const err = new APIVoiceConverterError(new Error("x")).setResponse("");
      expect(getReportedDurationSec(err)).toBe(0);
    });

    it("should return 0 when the response is not valid JSON", () => {
      const err = new APIVoiceConverterError(new Error("x")).setResponse("not json");
      expect(getReportedDurationSec(err)).toBe(0);
    });

    it("should return 0 when duration_seconds is missing", () => {
      const err = new APIVoiceConverterError(new Error("x")).setResponse(
        JSON.stringify({ error: "Audio too long" }),
      );
      expect(getReportedDurationSec(err)).toBe(0);
    });

    it.each([
      ["string", '{"duration_seconds":"45.2"}'],
      ["null", '{"duration_seconds":null}'],
      ["boolean", '{"duration_seconds":true}'],
      ["array", '{"duration_seconds":[45.2]}'],
      ["object", '{"duration_seconds":{"value":45.2}}'],
    ])("should return 0 when duration_seconds is a %s", (_, body) => {
      const err = new APIVoiceConverterError(new Error("x")).setResponse(body);
      expect(getReportedDurationSec(err)).toBe(0);
    });

    it("should return 0 when the parsed JSON is not an object", () => {
      const err = new APIVoiceConverterError(new Error("x")).setResponse("42");
      expect(getReportedDurationSec(err)).toBe(0);
    });
  });
});
