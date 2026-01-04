/* eslint-disable no-console */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Logger } from "./index.js";
import * as sentryUtils from "../monitoring/sentry/index.js";

vi.mock("node:cluster", () => import("../../__mocks__/cluster.js"));
vi.mock("picocolors", () => {
  return {
    default: {
      green: vi.fn((msg: string) => msg),
      red: vi.fn((msg: string) => msg),
      yellow: vi.fn((msg: string) => msg),
      dim: vi.fn((msg: string) => msg),
    },
  };
});

vi.mock("./integration");
vi.mock("../env");

vi.spyOn(global.console, "log").mockReturnValue();
vi.spyOn(global.console, "warn").mockReturnValue();
vi.spyOn(global.console, "error").mockReturnValue();
vi.spyOn(sentryUtils, "captureError").mockReturnValue();
vi.spyOn(sentryUtils, "captureWarning").mockReturnValue();

let logLevel: string | undefined = undefined;

const testMessage = "some message";

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LOG_LEVEL error", () => {
    beforeEach(() => {
      logLevel = "ERROR";
    });

    it("should not send debug logs", () => {
      const log = new Logger("some-id", logLevel);
      log.debug(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should not send info logs", () => {
      const log = new Logger("some-id", logLevel);
      log.info(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should not send warn logs", () => {
      const log = new Logger("some-id", logLevel);
      log.warn(testMessage);
      expect(console.warn).not.toHaveBeenCalled();
      expect(sentryUtils.captureWarning).not.toHaveBeenCalled();
      log.warn(testMessage, {}, true);
      expect(console.warn).not.toHaveBeenCalled();
      expect(sentryUtils.captureWarning).not.toHaveBeenCalled();
    });

    it("should send error logs", () => {
      const log = new Logger("some-id", logLevel);
      const err = new Error("ooops");
      log.error(testMessage, err);
      expect(console.error).toHaveBeenCalledWith(expect.any(String), testMessage, err);
    });
  });

  describe("LOG_LEVEL warn", () => {
    beforeEach(() => {
      logLevel = "WARN";
    });

    it("should not send debug logs", () => {
      const log = new Logger("some-id", logLevel);
      log.debug(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should not send info logs", () => {
      const log = new Logger("some-id", logLevel);
      log.info(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should send warn logs", () => {
      const log = new Logger("some-id", logLevel);
      const context = { foo: "bar" };
      log.warn(testMessage, context);
      expect(console.warn).toHaveBeenCalledWith(expect.any(String), testMessage, context);
      expect(sentryUtils.captureWarning).not.toHaveBeenCalled();
    });

    it("should send warn logs and report to sentry", () => {
      const log = new Logger("some-id", logLevel);
      const context = { foo: "bar" };
      log.warn(testMessage, context, true);
      expect(console.warn).toHaveBeenCalledWith(expect.any(String), testMessage, context);
      expect(sentryUtils.captureWarning).toHaveBeenCalledWith(testMessage, context);
    });

    it("should send error logs", () => {
      const log = new Logger("some-id", logLevel);
      const err = new Error("ooops");
      log.error(testMessage, err);
      expect(console.error).toHaveBeenCalledWith(expect.any(String), testMessage, err);
    });
  });

  describe("LOG_LEVEL info", () => {
    beforeEach(() => {
      logLevel = "INFO";
    });

    it("should not send debug logs", () => {
      const log = new Logger("some-id", logLevel);
      log.debug(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should send info logs", () => {
      const log = new Logger("some-id", logLevel);
      log.info(testMessage);
      expect(console.log).toHaveBeenCalledWith(expect.any(String), testMessage);
    });

    it("should send warn logs", () => {
      const log = new Logger("some-id", logLevel);
      const context = { foo: "bar" };
      log.warn(testMessage, context);
      expect(console.warn).toHaveBeenCalledWith(expect.any(String), testMessage, context);
      expect(sentryUtils.captureWarning).not.toHaveBeenCalled();
    });

    it("should send warn logs and report to sentry", () => {
      const log = new Logger("some-id", logLevel);
      const context = { foo: "bar" };
      log.warn(testMessage, context, true);
      expect(console.warn).toHaveBeenCalledWith(expect.any(String), testMessage, context);
      expect(sentryUtils.captureWarning).toHaveBeenCalledWith(testMessage, context);
    });

    it("should send error logs", () => {
      const log = new Logger("some-id", logLevel);
      const err = new Error("ooops");
      log.error(testMessage, err);
      expect(console.error).toHaveBeenCalledWith(expect.any(String), testMessage, err);
    });
  });

  describe("LOG_LEVEL debug", () => {
    beforeEach(() => {
      logLevel = "DEBUG";
    });

    it("should send debug logs", () => {
      const log = new Logger("some-id", logLevel);
      log.debug(testMessage);
      expect(console.log).toHaveBeenCalledWith(expect.any(String), testMessage);
    });

    it("should send info logs", () => {
      const log = new Logger("some-id", logLevel);
      log.info(testMessage);
      expect(console.log).toHaveBeenCalledWith(expect.any(String), testMessage);
    });

    it("should send warn logs", () => {
      const log = new Logger("some-id", logLevel);
      log.warn(testMessage);
      expect(console.warn).toHaveBeenCalledWith(expect.any(String), testMessage, "");
    });

    it("should send error logs", () => {
      const log = new Logger("some-id", logLevel);
      const err = new Error("ooops");
      log.error(testMessage, err);
      expect(console.error).toHaveBeenCalledWith(expect.any(String), testMessage, err);
    });
  });

  describe("LOG_LEVEL info when it is non-level value", () => {
    beforeEach(() => {
      logLevel = "non-recognized";
    });

    it("should not send debug logs", () => {
      const log = new Logger("some-id", logLevel);
      log.debug(testMessage);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should send info logs", () => {
      const log = new Logger("some-id", logLevel);
      log.info(testMessage);
      expect(console.log).toHaveBeenCalledWith(expect.any(String), testMessage);
    });

    it("should send warn logs", () => {
      const log = new Logger("some-id", logLevel);
      log.warn(testMessage);
      expect(console.warn).toHaveBeenCalledWith(expect.any(String), testMessage, "");
    });

    it("should send error logs", () => {
      const log = new Logger("some-id", logLevel);
      const err = new Error("ooops");
      log.error(testMessage, err);
      expect(console.error).toHaveBeenCalledWith(expect.any(String), testMessage, err);
    });
  });
});
