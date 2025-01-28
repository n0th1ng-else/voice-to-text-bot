import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let initTgReflector;
let TgError;

vi.mock("../logger/index");

let res: Promise<boolean> = Promise.resolve(true);
const leaveChatMock = vi.fn().mockImplementation(() => res);

vi.mock("./api/tgapi", () => {
  return {
    TelegramApi: function () {
      return {
        leaveChat: leaveChatMock,
      };
    },
  };
});

describe("initTgReflector", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    const r = await import("./reflector.ts");
    const e = await import("./api/tgerror.ts");
    initTgReflector = r.initTgReflector;
    TgError = e.TgError;
  });

  describe("happy flow", () => {
    beforeEach(() => {
      res = Promise.resolve(true);
    });

    it("should leave the chat if not enough rights to send text messages to the chat", () => {
      const reflector = initTgReflector("token");
      const tgErr = new TgError("ooops", new Error("ooops"));
      const chatId = 1213455;

      tgErr.setErrorCode(400).setChatId(chatId).setResponse({
        ok: false,
        result: undefined,
        description:
          "Bad Request: not enough rights to send text messages to the chat",
      });

      return reflector(tgErr).then(() => {
        expect(leaveChatMock).toHaveBeenCalledTimes(1);
        expect(leaveChatMock).toHaveBeenCalledWith(chatId);
      });
    });

    it("should do nothing if the chatId is empty", () => {
      const reflector = initTgReflector("token");
      const tgErr = new TgError("ooops", new Error("ooops"));

      tgErr.setErrorCode(400).setResponse({
        ok: false,
        result: undefined,
        description:
          "Bad Request: not enough rights to send text messages to the chat",
      });

      return reflector(tgErr).then(() => {
        expect(leaveChatMock).not.toHaveBeenCalled();
      });
    });

    it("should do nothing if the error is different", () => {
      const reflector = initTgReflector("token");
      const tgErr = new TgError("ooops", new Error("ooops"));

      tgErr.setErrorCode(400).setChatId(21313).setResponse({
        ok: false,
        result: undefined,
        description: "Bad Request: another error",
      });

      return reflector(tgErr).then(() => {
        expect(leaveChatMock).not.toHaveBeenCalled();
      });
    });
  });

  describe("unhappy flow", () => {
    beforeEach(() => {
      res = Promise.reject(new Error("leave chat fails :("));
    });

    it("should not fail if leave chat fails", () => {
      const reflector = initTgReflector("token");
      const tgErr = new TgError("ooops", new Error("ooops"));
      const chatId = 1213455;

      tgErr.setErrorCode(400).setChatId(chatId).setResponse({
        ok: false,
        result: undefined,
        description:
          "Bad Request: not enough rights to send text messages to the chat",
      });

      return reflector(tgErr).then(() => {
        expect(leaveChatMock).toHaveBeenCalledTimes(1);
        expect(leaveChatMock).toHaveBeenCalledWith(chatId);
      });
    });
  });
});
