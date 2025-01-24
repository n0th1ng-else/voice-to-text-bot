import { describe, it, expect } from "vitest";
import {
  TgError,
  hasNoRightsToSendMessage,
  isBlockedByUser,
  isMessageNotModified,
  isKickedFromSupergroup,
} from "./tgerror.js";
import { type TgCore } from "./types.js";
import { SANITIZE_CHARACTER } from "../../logger/const.js";

describe("tgerror", () => {
  describe("TgError", () => {
    it("should construct the Telegram error wrapper", () => {
      const errCause = new Error("original error");
      const msg = "ooops";
      const err = new TgError(errCause, msg);
      expect(err.cause).toBe(errCause);
      expect(err.message).toBe(`ETELEGRAM ${msg}`);
      expect(err.code).toBe(0);
      expect(err.chatId).toBe(undefined);
      expect(err.response).toBe(undefined);
      expect(err.migrateToChatId).toBe(0);
      expect(err.retryAfter).toBe(0);
      expect(err.url).toBe("");
    });

    it("should set the error code", () => {
      const errCause = new Error("original error");
      const msg = "ooops";
      const err = new TgError(errCause, msg);
      err.setErrorCode(400);
      expect(err.cause).toBe(errCause);
      expect(err.message).toBe(`ETELEGRAM ${msg}`);
      expect(err.code).toBe(400);
      expect(err.chatId).toBe(undefined);
      expect(err.response).toBe(undefined);
      expect(err.migrateToChatId).toBe(0);
      expect(err.retryAfter).toBe(0);
      expect(err.url).toBe("");
    });

    it("should set the chat id", () => {
      const errCause = new Error("original error");
      const msg = "ooops";
      const err = new TgError(errCause, msg);
      const chatId = 1234555;
      err.setChatId(chatId);
      expect(err.cause).toBe(errCause);
      expect(err.message).toBe(`ETELEGRAM ${msg}`);
      expect(err.code).toBe(0);
      expect(err.chatId).toBe(chatId);
      expect(err.response).toBe(undefined);
      expect(err.migrateToChatId).toBe(0);
      expect(err.retryAfter).toBe(0);
      expect(err.url).toBe("");
    });

    it("should set retry", () => {
      const errCause = new Error("original error");
      const msg = "ooops";
      const err = new TgError(errCause, msg);
      const retry = 10;
      err.setRetryAfter(retry);
      expect(err.cause).toBe(errCause);
      expect(err.message).toBe(`ETELEGRAM ${msg}`);
      expect(err.code).toBe(0);
      expect(err.chatId).toBe(undefined);
      expect(err.response).toBe(undefined);
      expect(err.migrateToChatId).toBe(0);
      expect(err.retryAfter).toBe(retry);
      expect(err.url).toBe("");
    });

    it("should set migration chat", () => {
      const errCause = new Error("original error");
      const msg = "ooops";
      const err = new TgError(errCause, msg);
      const chatId = 234353453;
      err.setMigrateToChatId(chatId);
      expect(err.cause).toBe(errCause);
      expect(err.message).toBe(`ETELEGRAM ${msg}`);
      expect(err.code).toBe(0);
      expect(err.chatId).toBe(undefined);
      expect(err.response).toBe(undefined);
      expect(err.migrateToChatId).toBe(chatId);
      expect(err.retryAfter).toBe(0);
      expect(err.url).toBe("");
    });

    it("should set the url", () => {
      const errCause = new Error("original error");
      const msg = "ooops";
      const err = new TgError(errCause, msg);
      const url = "http://google.com";
      err.setUrl(url, "");
      expect(err.cause).toBe(errCause);
      expect(err.message).toBe(`ETELEGRAM ${msg}`);
      expect(err.code).toBe(0);
      expect(err.chatId).toBe(undefined);
      expect(err.response).toBe(undefined);
      expect(err.migrateToChatId).toBe(0);
      expect(err.retryAfter).toBe(0);
      expect(err.url).toBe(url);
    });

    it("should sanitize the url", () => {
      const errCause = new Error("original error");
      const msg = "ooops";
      const err = new TgError(errCause, msg);
      const apiToken = "a$asdlml@%";
      const url = `http://google.com/${apiToken}/sendMessage`;
      err.setUrl(url, apiToken);
      expect(err.cause).toBe(errCause);
      expect(err.message).toBe(`ETELEGRAM ${msg}`);
      expect(err.code).toBe(0);
      expect(err.chatId).toBe(undefined);
      expect(err.response).toBe(undefined);
      expect(err.migrateToChatId).toBe(0);
      expect(err.retryAfter).toBe(0);
      expect(err.url).toBe(
        `http://google.com/${SANITIZE_CHARACTER}/sendMessage`,
      );
    });

    it("should set the response", () => {
      const errCause = new Error("original error");
      const msg = "ooops";
      const err = new TgError(errCause, msg);
      const response: TgCore<void> = {
        ok: false,
        result: undefined,
      };
      err.setResponse(response);
      expect(err.cause).toBe(errCause);
      expect(err.message).toBe(`ETELEGRAM ${msg}`);
      expect(err.code).toBe(0);
      expect(err.chatId).toBe(undefined);
      expect(err.response).toBe(response);
      expect(err.migrateToChatId).toBe(0);
      expect(err.retryAfter).toBe(0);
      expect(err.url).toBe("");
    });
  });

  describe("isKickedFromSupergroup", () => {
    it("should return false if the argument is non-tg error", () => {
      expect(isKickedFromSupergroup(new Error("just an error"))).toBe(false);
    });

    it("should return false if the error description is different", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(403).setResponse({
        ok: false,
        result: undefined,
        description: "Forbidden: another reason",
      });
      expect(isKickedFromSupergroup(tgErr)).toBe(false);
    });

    it("should return false if the error code is different", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(400).setResponse({
        ok: false,
        result: undefined,
        description: "Forbidden: bot was kicked from the supergroup chat",
      });
      expect(isKickedFromSupergroup(tgErr)).toBe(false);
    });

    it("should return false if the error is ok", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(403).setResponse({
        ok: true,
        result: undefined,
        description: "Forbidden: bot was kicked from the supergroup chat",
      });
      expect(isKickedFromSupergroup(tgErr)).toBe(false);
    });

    it("should return true if bot was blocked by the user", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(403).setResponse({
        ok: false,
        result: undefined,
        description: "Forbidden: bot was kicked from the supergroup chat",
      });
      expect(isKickedFromSupergroup(tgErr)).toBe(true);
    });
  });

  describe("isBlockedByUser", () => {
    it("should return false if the argument is non-tg error", () => {
      expect(isBlockedByUser(new Error("just an error"))).toBe(false);
    });

    it("should return false if the error description is different", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(403).setResponse({
        ok: false,
        result: undefined,
        description: "Forbidden: another reason",
      });
      expect(isBlockedByUser(tgErr)).toBe(false);
    });

    it("should return false if the error code is different", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(400).setResponse({
        ok: false,
        result: undefined,
        description: "Forbidden: bot was blocked by the user",
      });
      expect(isBlockedByUser(tgErr)).toBe(false);
    });

    it("should return false if the error is ok", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(403).setResponse({
        ok: true,
        result: undefined,
        description: "Forbidden: bot was blocked by the user",
      });
      expect(isBlockedByUser(tgErr)).toBe(false);
    });

    it("should return true if bot was blocked by the user", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(403).setResponse({
        ok: false,
        result: undefined,
        description: "Forbidden: bot was blocked by the user",
      });
      expect(isBlockedByUser(tgErr)).toBe(true);
    });
  });

  describe("hasNoRightsToSendMessage", () => {
    it("should return false if the argument is non-tg error", () => {
      expect(hasNoRightsToSendMessage(new Error("just an error"))).toBe(false);
    });

    it("should return false if the error description is different", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(400).setResponse({
        ok: false,
        result: undefined,
        description: "Bad Request: another reason",
      });
      expect(hasNoRightsToSendMessage(tgErr)).toBe(false);
    });

    it("should return false if the error code is different", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(403).setResponse({
        ok: false,
        result: undefined,
        description:
          "Bad Request: not enough rights to send text messages to the chat",
      });
      expect(hasNoRightsToSendMessage(tgErr)).toBe(false);
    });

    it("should return false if the error is ok", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(400).setResponse({
        ok: true,
        result: undefined,
        description:
          "Bad Request: not enough rights to send text messages to the chat",
      });
      expect(hasNoRightsToSendMessage(tgErr)).toBe(false);
    });

    it("should return true if bot was blocked by the user", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(400).setResponse({
        ok: false,
        result: undefined,
        description:
          "Bad Request: not enough rights to send text messages to the chat",
      });
      expect(hasNoRightsToSendMessage(tgErr)).toBe(true);
    });
  });

  describe("isMessageNotModified", () => {
    it("should return false if the argument is non-tg error", () => {
      expect(isMessageNotModified(new Error("just an error"))).toBe(false);
    });

    it("should return false if the error description is different", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(400).setResponse({
        ok: false,
        result: undefined,
        description: "Bad Request: another reason",
      });
      expect(isMessageNotModified(tgErr)).toBe(false);
    });

    it("should return false if the error code is different", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(403).setResponse({
        ok: false,
        result: undefined,
        description:
          "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message",
      });
      expect(isMessageNotModified(tgErr)).toBe(false);
    });

    it("should return false if the error is ok", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(400).setResponse({
        ok: true,
        result: undefined,
        description:
          "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message",
      });
      expect(isMessageNotModified(tgErr)).toBe(false);
    });

    it("should return true if the message is not modified", () => {
      const tgErr = new TgError(new Error("ooops"), "ooops");
      tgErr.setErrorCode(400).setResponse({
        ok: false,
        result: undefined,
        description:
          "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message",
      });
      expect(isMessageNotModified(tgErr)).toBe(true);
    });
  });
});
