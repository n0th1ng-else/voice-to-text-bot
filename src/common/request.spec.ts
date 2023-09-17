import {
  describe,
  it,
  expect,
  beforeAll,
  jest,
  afterEach,
  afterAll,
} from "@jest/globals";
import { setupServer } from "msw/node";
import { rest } from "msw";
import { parseChunkedResponse, runRequestWithTimeout } from "./request.js";
import { localhostUrl } from "../const.js";
import { sleepFor } from "./timer.js";

const TEST_TIMEOUT = 100;
const REQ_TIMEOUT = 300;

export const resolveUrl = rest.get(
  `${localhostUrl}/resolve`,
  async (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        SUCCESS: "YES",
      }),
    );
  },
);

export const rejectUrl = rest.get(
  `${localhostUrl}/reject`,
  async (req, res, ctx) => {
    return res(
      ctx.status(400),
      ctx.json({
        SUCCESS: "NO",
      }),
    );
  },
);

export const hangUrl = rest.get(
  `${localhostUrl}/hang`,
  async (req, res, ctx) => {
    await sleepFor(REQ_TIMEOUT);
    return res(
      ctx.status(200),
      ctx.json({
        FINISHED: "YES",
      }),
    );
  },
);

const mswServer = setupServer(resolveUrl, rejectUrl, hangUrl);

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

  describe("runRequestWithTimeout", () => {
    beforeAll(() => {
      jest.useFakeTimers();
      mswServer.listen();
    });
    afterEach(() => {
      mswServer.resetHandlers();
    });
    afterAll(() => {
      jest.useRealTimers();
      mswServer.close();
    });

    describe("no timeout", () => {
      it("resolves the data", async () => {
        const result = runRequestWithTimeout({
          url: "/resolve",
        });

        await expect(result).resolves.not.toThrow();
        expect(await result).toEqual({ SUCCESS: "YES" });
      });

      it("proxies the reject error", async () => {
        const result = runRequestWithTimeout({
          url: "/reject",
        });

        await expect(result).rejects.toThrow();
      });
    });

    describe("with timeout", () => {
      it("resolves the data", async () => {
        const result = runRequestWithTimeout(
          {
            url: "/resolve",
          },
          TEST_TIMEOUT,
        );

        await expect(result).resolves.not.toThrow();
        expect(await result).toEqual({ SUCCESS: "YES" });
      });

      it("proxies the reject error", async () => {
        const result = runRequestWithTimeout(
          {
            url: "/reject",
          },
          TEST_TIMEOUT,
        );

        await expect(result).rejects.toThrow();
      });

      it("rejects by timeout", async () => {
        const result = runRequestWithTimeout(
          {
            url: "/hang",
          },
          TEST_TIMEOUT,
        );

        jest.advanceTimersByTime(2 * REQ_TIMEOUT);
        await expect(result).rejects.toThrow(
          new Error("Streaming network request took too long to resolve"),
        );
      });
    });
  });
});
