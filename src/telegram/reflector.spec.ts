import { describe, it, expect, vi } from "vitest";
import { initTgReflector } from "./reflector.js";
import { TgError } from "./api/tgerror.js";
import { asChatId__test } from "../testUtils/types.js";

vi.mock("../logger/index");

describe("initTgReflector", () => {
  describe("happy flow", () => {
    it("should leave the chat if not enough rights to send text messages to the chat", async () => {
      const leaveChat = vi.fn().mockImplementation(() => Promise.resolve(true));
      const reflect = initTgReflector({ leaveChat });
      const tgErr = new TgError(new Error("ooops"), "ooops");
      const chatId = asChatId__test(1213455);

      tgErr.setErrorCode(400).setChatId(chatId).setResponse({
        ok: false,
        result: undefined,
        description: "Bad Request: not enough rights to send text messages to the chat",
      });
      await reflect(tgErr);
      expect(leaveChat).toHaveBeenCalledTimes(1);
      expect(leaveChat).toHaveBeenCalledWith(chatId);
    });

    it("should do nothing if the chatId is empty", async () => {
      const leaveChat = vi.fn().mockImplementation(() => Promise.resolve(true));

      const reflect = initTgReflector({ leaveChat });
      const tgErr = new TgError(new Error("ooops"), "ooops");

      tgErr.setErrorCode(400).setResponse({
        ok: false,
        result: undefined,
        description: "Bad Request: not enough rights to send text messages to the chat",
      });

      await reflect(tgErr);
      expect(leaveChat).not.toHaveBeenCalled();
    });

    it("should do nothing if the error is different", async () => {
      const leaveChat = vi.fn().mockImplementation(() => Promise.resolve(true));
      const reflect = initTgReflector({ leaveChat });
      const tgErr = new TgError(new Error("ooops"), "ooops");
      const chatId = asChatId__test(21313);

      tgErr.setErrorCode(400).setChatId(chatId).setResponse({
        ok: false,
        result: undefined,
        description: "Bad Request: another error",
      });

      await reflect(tgErr);
      expect(leaveChat).not.toHaveBeenCalled();
    });
  });

  describe("unhappy flow", () => {
    it("should not fail if leave chat fails", async () => {
      const leaveChat = vi
        .fn()
        .mockImplementation(() => Promise.reject(new Error("leave chat fails :(")));
      const reflect = initTgReflector({ leaveChat });
      const tgErr = new TgError(new Error("ooops"), "ooops");
      const chatId = asChatId__test(1213455);

      tgErr.setErrorCode(400).setChatId(chatId).setResponse({
        ok: false,
        result: undefined,
        description: "Bad Request: not enough rights to send text messages to the chat",
      });

      await reflect(tgErr);
      expect(leaveChat).toHaveBeenCalledTimes(1);
      expect(leaveChat).toHaveBeenCalledWith(chatId);
    });

    it("should not fail if leave chat return false", async () => {
      const leaveChat = vi.fn().mockImplementation(() => Promise.resolve(false));
      const reflect = initTgReflector({ leaveChat });
      const tgErr = new TgError(new Error("ooops"), "ooops");
      const chatId = asChatId__test(1213455);

      tgErr.setErrorCode(400).setChatId(chatId).setResponse({
        ok: false,
        result: undefined,
        description: "Bad Request: not enough rights to send text messages to the chat",
      });

      await reflect(tgErr);
      expect(leaveChat).toHaveBeenCalledTimes(1);
      expect(leaveChat).toHaveBeenCalledWith(chatId);
    });
  });
});
