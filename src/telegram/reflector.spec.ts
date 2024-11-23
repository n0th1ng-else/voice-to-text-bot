import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

let initTgReflector;
let TgError;

jest.unstable_mockModule(
  "../logger/index",
  () => import("../logger/__mocks__/index.js"),
);

let res: Promise<boolean> = Promise.resolve(true);
const leaveChatMock = jest.fn().mockImplementation(() => res);

jest.unstable_mockModule("./api/tgapi", () => {
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
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const r = await import("./reflector.js");
    const e = await import("./api/tgerror.js");
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
