import { describe, it, expect } from "@jest/globals";
import { parseChunkedResponse } from "./request.js";

describe("request", () => {
  describe("parseChunkedResponse", () => {
    it("returns empty array if the input was empty string", () => {
      expect(parseChunkedResponse("")).toEqual([]);
    });

    it("returns the data if it was a single chunk", () => {
      expect(parseChunkedResponse('{"foo":"bar"}')).toEqual([{ foo: "bar" }]);
    });

    it("returns the data even if it has incomplete chunk", () => {
      expect(parseChunkedResponse('{"foo":"bar"}\r\n{"baz":')).toEqual([
        { foo: "bar" },
      ]);
    });

    it("returns the data even if it has empty", () => {
      expect(parseChunkedResponse('{"foo":"bar"}\r\n \r\n')).toEqual([
        { foo: "bar" },
      ]);
    });

    it("returns the data even if it has split chunk", () => {
      expect(parseChunkedResponse('{"foo":"ba\r\nr"}')).toEqual([
        { foo: "bar" },
      ]);
    });
  });
});
