import { describe, it, expect } from "@jest/globals";
import { WitAiError } from "./wit.ai.error.js";

describe("WitAiError", () => {
  it("should construct the WitAi error wrapper", () => {
    const errCause = new Error("original error");
    const msg = "ooops";
    const err = new WitAiError(errCause, msg);
    expect(err.cause).toBe(errCause);
    expect(err.message).toBe(`EWITAI ${msg}`);
    expect(err.code).toBe(0);
    expect(err.response).toBe(undefined);
    expect(err.url).toBe("");
    expect(err.bufferLength).toBe(-1);
  });

  it("should set the error code", () => {
    const errCause = new Error("original error");
    const msg = "ooops";
    const err = new WitAiError(errCause, msg);
    err.setErrorCode(400);
    expect(err.cause).toBe(errCause);
    expect(err.message).toBe(`EWITAI ${msg}`);
    expect(err.code).toBe(400);
    expect(err.response).toBe(undefined);
    expect(err.url).toBe("");
    expect(err.bufferLength).toBe(-1);
  });

  it("should set the url", () => {
    const errCause = new Error("original error");
    const msg = "ooops";
    const err = new WitAiError(errCause, msg);
    const url = "https://google.com";
    err.setUrl(url);
    expect(err.cause).toBe(errCause);
    expect(err.message).toBe(`EWITAI ${msg}`);
    expect(err.code).toBe(0);
    expect(err.response).toBe(undefined);
    expect(err.url).toBe(url);
    expect(err.bufferLength).toBe(-1);
  });

  it("should set the buffer length", () => {
    const errCause = new Error("original error");
    const msg = "ooops";
    const err = new WitAiError(errCause, msg);
    const bufferMessage = "hello";
    const buff = new Buffer(bufferMessage);
    err.setBufferLength(buff);
    expect(err.cause).toBe(errCause);
    expect(err.message).toBe(`EWITAI ${msg}`);
    expect(err.code).toBe(0);
    expect(err.response).toBe(undefined);
    expect(err.url).toBe("");
    expect(err.bufferLength).toBe(bufferMessage.length);
  });

  it.each([
    ["object", { foo: "bar" }],
    ["array", [1]],
    ["number", 191],
    ["boolean", true],
    ["non-serialized string", "foo-bar {}"],
  ])("should set the non-string response (%s)", (_, response) => {
    const errCause = new Error("original error");
    const msg = "ooops";
    const err = new WitAiError(errCause, msg);
    err.setResponse(response);
    expect(err.cause).toBe(errCause);
    expect(err.message).toBe(`EWITAI ${msg}`);
    expect(err.code).toBe(0);
    expect(err.response).toEqual({ message: response });
    expect(err.url).toBe("");
    expect(err.bufferLength).toBe(-1);
  });

  it("should set the serialized response", () => {
    const errCause = new Error("original error");
    const msg = "ooops";
    const err = new WitAiError(errCause, msg);
    const response = { foo: "bar" };
    err.setResponse(JSON.stringify(response));
    expect(err.cause).toBe(errCause);
    expect(err.message).toBe(`EWITAI ${msg}`);
    expect(err.code).toBe(0);
    expect(err.response).toEqual(response);
    expect(err.url).toBe("");
    expect(err.bufferLength).toBe(-1);
  });
});
