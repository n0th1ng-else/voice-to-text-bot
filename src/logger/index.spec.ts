/* eslint-disable no-console */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Logger } from "./index.js";

jest.unstable_mockModule(
  "node:cluster",
  () => import("../../__mocks__/cluster.js"),
);
jest.unstable_mockModule("picocolors", () => {
  return {
    default: {
      green: jest.fn((msg: string) => msg),
      red: jest.fn((msg: string) => msg),
      yellow: jest.fn((msg: string) => msg),
      dim: jest.fn((msg: string) => msg),
    },
  };
});

jest.unstable_mockModule(
  "./integration",
  () => import("./__mocks__/integration.js"),
);
jest.unstable_mockModule(
  "../monitoring/sentry",
  () => import("../monitoring/__mocks__/sentry.js"),
);
jest.unstable_mockModule("../env", () => import("../__mocks__/env.js"));

jest.spyOn(global.console, "log");
jest.spyOn(global.console, "warn");
jest.spyOn(global.console, "error");

let LOG_LEVEL: string | undefined = undefined;

const testMessage = "some message";

const getLogger = async (): Promise<typeof Logger> => {
  const init = await import("./index.js");
  return init.Logger;
};
describe("Logger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("LOG_LEVEL error", () => {
    beforeEach(() => {
      LOG_LEVEL = "ERROR";
    });

    it("should not send debug logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.debug(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should not send info logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.info(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should not send warn logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.warn(testMessage);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it("should send error logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      const err = new Error("ooops");
      log.error(testMessage, err);
      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        testMessage,
        err,
      );
    });
  });

  describe("LOG_LEVEL warn", () => {
    beforeEach(() => {
      LOG_LEVEL = "WARN";
    });

    it("should not send debug logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.debug(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should not send info logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.info(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should send warn logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.warn(testMessage);
      expect(console.warn).toHaveBeenCalledWith(
        expect.any(String),
        testMessage,
        "",
      );
    });

    it("should send error logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      const err = new Error("ooops");
      log.error(testMessage, err);
      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        testMessage,
        err,
      );
    });
  });

  describe("LOG_LEVEL info", () => {
    beforeEach(() => {
      LOG_LEVEL = "INFO";
    });

    it("should not send debug logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.debug(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should send info logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.info(testMessage);
      expect(console.log).toHaveBeenCalledWith(expect.any(String), testMessage);
    });

    it("should send warn logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.warn(testMessage);
      expect(console.warn).toHaveBeenCalledWith(
        expect.any(String),
        testMessage,
        "",
      );
    });

    it("should send error logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      const err = new Error("ooops");
      log.error(testMessage, err);
      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        testMessage,
        err,
      );
    });
  });

  describe("LOG_LEVEL debug", () => {
    beforeEach(() => {
      LOG_LEVEL = "DEBUG";
    });

    it("should send debug logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.debug(testMessage);
      expect(console.log).toHaveBeenCalledWith(expect.any(String), testMessage);
    });

    it("should send info logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.info(testMessage);
      expect(console.log).toHaveBeenCalledWith(expect.any(String), testMessage);
    });

    it("should send warn logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.warn(testMessage);
      expect(console.warn).toHaveBeenCalledWith(
        expect.any(String),
        testMessage,
        "",
      );
    });

    it("should send error logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      const err = new Error("ooops");
      log.error(testMessage, err);
      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        testMessage,
        err,
      );
    });
  });

  describe("LOG_LEVEL info when it is non-level value", () => {
    beforeEach(() => {
      LOG_LEVEL = "non-recognized";
    });

    it("should not send debug logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.debug(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should send info logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.info(testMessage);
      expect(console.log).toHaveBeenCalledWith(expect.any(String), testMessage);
    });

    it("should send warn logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      log.warn(testMessage);
      expect(console.warn).toHaveBeenCalledWith(
        expect.any(String),
        testMessage,
        "",
      );
    });

    it("should send error logs", async () => {
      const Logger = await getLogger();
      const log = new Logger("some-id", LOG_LEVEL);
      const err = new Error("ooops");
      log.error(testMessage, err);
      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        testMessage,
        err,
      );
    });
  });
});
