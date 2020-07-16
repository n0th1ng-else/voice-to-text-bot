import axios, { AxiosError, AxiosRequestConfig, AxiosStatic } from "axios";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TelegramApi } from "./index";
import { nanoid } from "nanoid";
import {
  BotCommandDto,
  TgChatType,
  TgCore,
  TgError,
  TgFile,
  TgInlineKeyboardButton,
  TgMessage,
  TgWebHook,
} from "./types";

const getApiResponse = <Response>(
  ok: boolean,
  result: Response,
  errorCode?: number,
  errorDescription?: string,
  retryAfter?: number,
  migrateChatId?: number
): TgCore<Response> => {
  const hasMeta = migrateChatId || retryAfter;
  return {
    ok,
    result,
    description: errorDescription,
    error_code: errorCode,
    parameters:
      (hasMeta && {
        migrate_to_chat_id: migrateChatId,
        retry_after: retryAfter,
      }) ||
      undefined,
  };
};
const testClient = axios.create();

function getPromiseError<R>(fn: () => Promise<R>): Promise<TgError> {
  return new Promise((resolve, reject) => {
    fn().then(
      (data) => reject(data),
      (err) => resolve(err)
    );
  });
}

let testApiToken = nanoid(10);
let api = new TelegramApi(testApiToken);

let checkApiData = (config: AxiosRequestConfig): void => {
  throw new Error(`Initialize check api data ${config}`);
};

// TODO fix type definition
let testApiResponse;

const clientSpy = jest
  .spyOn<AxiosStatic, "create">(axios, "create")
  .mockImplementation((config?: AxiosRequestConfig) => {
    if (!config) {
      throw new Error("config can not be empty");
    }
    expect(config.baseURL).toBe(TelegramApi.url);
    expect(config.timeout).toBe(TelegramApi.timeout);
    expect(config.method).toBe("POST");
    expect(config.responseType).toBe("json");
    expect(config.headers.Accept).toBe("application/json");
    expect(config.headers["Content-Type"]).toBe("application/json");
    return testClient;
  });

describe("[telegram api client]", () => {
  beforeEach(() => {
    clientSpy.mockClear();
    testApiToken = nanoid(10);
    api = new TelegramApi(testApiToken);
  });

  describe("telegram response", () => {
    beforeEach(() => {
      jest.spyOn(testClient, "request").mockImplementationOnce((config) => {
        checkApiData(config);
        return Promise.resolve().then(() => ({ data: testApiResponse }));
      });
    });

    describe("good cases", () => {
      it("setWebHook", () => {
        testApiResponse = getApiResponse<boolean>(true, true);
        const testHook = "some-test-hook-url";
        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/setWebHook`);
          expect(Object.keys(config.data)).toHaveLength(1);
          expect(config.data.url).toBe(testHook);
        };

        return api.setWebHook(testHook).then((isOk) => {
          expect(isOk).toBe(true);
        });
      });

      it("setMyCommands", () => {
        testApiResponse = getApiResponse<boolean>(true, true);
        const testCommands: BotCommandDto[] = [
          {
            command: "/test1",
            description: "test1-description",
          },
          {
            command: "/com2",
            description: "co2-text",
          },
        ];

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/setMyCommands`);
          expect(config.data.commands).toBeDefined();
          expect(config.data.commands).toHaveLength(2);
          config.data.commands.forEach((cmd, ind) => {
            expect(cmd.command).toBe(testCommands[ind].command);
            expect(cmd.description).toBe(testCommands[ind].description);
          });
        };

        return api.setMyCommands(testCommands).then((isOk) => {
          expect(isOk).toBe(true);
        });
      });

      it("getWebHookInfo", () => {
        const testHook = "some-test-hook-url-tttt";

        testApiResponse = getApiResponse<TgWebHook>(true, { url: testHook });

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/getWebhookInfo`);
          expect(config.data).not.toBeDefined();
        };

        return api.getWebHookInfo().then((data) => {
          expect(Object.keys(data)).toHaveLength(1);
          expect(data.url).toBe(testHook);
        });
      });

      it("getFileLink", () => {
        const testFileId = "debug-file-id";
        const testFilePath = "path/to/tg/data";

        testApiResponse = getApiResponse<TgFile>(true, {
          file_id: testFileId,
          file_unique_id: "unused-identifier",
          file_path: testFilePath,
        });

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/getFile`);
          expect(config.data).toBeDefined();
          expect(Object.keys(config.data)).toHaveLength(1);
          expect(config.data.file_id).toBe(testFileId);
        };

        return api.getFileLink(testFileId).then((fileUrl) => {
          expect(fileUrl).toBe(
            `${TelegramApi.url}/file/bot${testApiToken}/${testFilePath}`
          );
        });
      });

      it("editMessageText", () => {
        const testChatId = 323426;
        const testMessageId = 657887689;
        const testText = "text-for-edit lalala";
        const testChatType = TgChatType.Private;
        testApiResponse = getApiResponse<TgMessage>(true, {
          date: new Date().getTime(),
          message_id: testMessageId,
          chat: {
            id: testChatId,
            type: testChatType,
          },
        });

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/editMessageText`);
          expect(Object.keys(config.data)).toHaveLength(3);
          expect(config.data.chat_id).toBe(testChatId);
          expect(config.data.message_id).toBe(testMessageId);
          expect(config.data.text).toBe(testText);
        };

        return api
          .editMessageText(testChatId, testMessageId, testText)
          .then((data) => {
            expect(data).toBeDefined();
            expect(data.message_id).toBe(testMessageId);
            expect(data.chat.id).toBe(testChatId);
            expect(data.chat.type).toBe(testChatType);
          });
      });

      it("sendMessage no params", () => {
        const testChatId = 323426;
        const testText = "text-for-edit lalala";
        const testChatType = TgChatType.Private;
        testApiResponse = getApiResponse<TgMessage>(true, {
          date: new Date().getTime(),
          message_id: 32411244,
          chat: {
            id: testChatId,
            type: testChatType,
          },
        });

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/sendMessage`);
          expect(Object.keys(config.data)).toHaveLength(2);
          expect(config.data.chat_id).toBe(testChatId);
          expect(config.data.text).toBe(testText);
        };

        return api.sendMessage(testChatId, testText).then((data) => {
          expect(data).toBeDefined();
          expect(data.chat.id).toBe(testChatId);
          expect(data.chat.type).toBe(testChatType);
        });
      });

      it("sendMessage with button", () => {
        const testChatId = 323426;
        const testText = "text-for-edit lalala";
        const testChatType = TgChatType.Private;

        const testButton: TgInlineKeyboardButton = {
          text: "cool btn",
          callback_data: "interesting data",
        };
        testApiResponse = getApiResponse<TgMessage>(true, {
          date: new Date().getTime(),
          message_id: 32411244,
          chat: {
            id: testChatId,
            type: testChatType,
          },
        });

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/sendMessage`);
          expect(Object.keys(config.data)).toHaveLength(3);
          expect(config.data.chat_id).toBe(testChatId);
          expect(config.data.text).toBe(testText);
          expect(config.data.reply_markup.inline_keyboard[0][0].text).toBe(
            testButton.text
          );
          expect(
            config.data.reply_markup.inline_keyboard[0][0].callback_data
          ).toBe(testButton.callback_data);
        };

        return api
          .sendMessage(testChatId, testText, [[testButton]])
          .then((data) => {
            expect(data).toBeDefined();
            expect(data.chat.id).toBe(testChatId);
            expect(data.chat.type).toBe(testChatType);
          });
      });

      it("sendMessage with link", () => {
        const testChatId = 323426;
        const testText = "text-for-edit lalala";
        const testChatType = TgChatType.Private;

        const testButton: TgInlineKeyboardButton = {
          text: "new link",
          url: "that lnk url",
        };
        testApiResponse = getApiResponse<TgMessage>(true, {
          date: new Date().getTime(),
          message_id: 32411244,
          chat: {
            id: testChatId,
            type: testChatType,
          },
        });

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/sendMessage`);
          expect(Object.keys(config.data)).toHaveLength(3);
          expect(config.data.chat_id).toBe(testChatId);
          expect(config.data.text).toBe(testText);
          expect(config.data.reply_markup.inline_keyboard[0][0].text).toBe(
            testButton.text
          );
          expect(config.data.reply_markup.inline_keyboard[0][0].url).toBe(
            testButton.url
          );
        };

        return api
          .sendMessage(testChatId, testText, [[testButton]])
          .then((data) => {
            expect(data).toBeDefined();
            expect(data.chat.id).toBe(testChatId);
            expect(data.chat.type).toBe(testChatType);
          });
      });
    });

    describe("telegram error cases", () => {
      it("telegram returned error code, description", () => {
        const testErrorCode = 984;
        const testErrorDescription = "Nobody bat an eye";

        testApiResponse = getApiResponse<boolean>(
          false,
          true,
          testErrorCode,
          testErrorDescription
        );
        const testHook = "some-test-hook-url";
        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/setWebHook`);
          expect(Object.keys(config.data)).toHaveLength(1);
          expect(config.data.url).toBe(testHook);
        };

        return getPromiseError(() => api.setWebHook(testHook)).then((err) => {
          expect(err.stack).toBeDefined();
          expect(err.message).toBe(`ETELEGRAM ${testErrorDescription}`);
          expect(err.code).toBe(testErrorCode);
          expect(err.url).toBe(`/bot${testApiToken}/setWebHook`);
          expect(err.response).toBe("");
          expect(err.migrateToChatId).toBe(0);
          expect(err.retryAfter).toBe(0);
        });
      });

      it("telegram returned error code, description, retryAfter", () => {
        const testErrorCode = 620;
        const testErrorDescription = "Nobody bat an eye";
        const testRetryAfter = 4456;

        testApiResponse = getApiResponse<boolean>(
          false,
          true,
          testErrorCode,
          testErrorDescription,
          testRetryAfter
        );
        const testCommands: BotCommandDto[] = [
          {
            command: "/test1",
            description: "test1-description",
          },
          {
            command: "/com2",
            description: "co2-text",
          },
        ];

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/setMyCommands`);
          expect(config.data.commands).toBeDefined();
          expect(config.data.commands).toHaveLength(2);
          config.data.commands.forEach((cmd, ind) => {
            expect(cmd.command).toBe(testCommands[ind].command);
            expect(cmd.description).toBe(testCommands[ind].description);
          });
        };

        return getPromiseError(() => api.setMyCommands(testCommands)).then(
          (err) => {
            expect(err.stack).toBeDefined();
            expect(err.message).toBe(`ETELEGRAM ${testErrorDescription}`);
            expect(err.code).toBe(testErrorCode);
            expect(err.url).toBe(`/bot${testApiToken}/setMyCommands`);
            expect(err.response).toBe("");
            expect(err.migrateToChatId).toBe(0);
            expect(err.retryAfter).toBe(testRetryAfter);
          }
        );
      });

      it("telegram returned error code", () => {
        const testErrorCode = 253;

        const testHook = "new-h-url";

        testApiResponse = getApiResponse<TgWebHook>(
          false,
          { url: testHook },
          testErrorCode
        );

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/getWebhookInfo`);
          expect(config.data).not.toBeDefined();
        };

        return getPromiseError(() => api.getWebHookInfo()).then((err) => {
          expect(err.stack).toBeDefined();
          expect(err.message).toBe(
            "ETELEGRAM Telegram request was unsuccessful"
          );
          expect(err.code).toBe(testErrorCode);
          expect(err.url).toBe(`/bot${testApiToken}/getWebhookInfo`);
          expect(err.response).toBe("");
          expect(err.migrateToChatId).toBe(0);
          expect(err.retryAfter).toBe(0);
        });
      });

      it("telegram returned error code, description, retryAfter, migrateChatId", () => {
        const testErrorCode = 918;
        const testErrorDescription = "Really a trouble";
        const testRetryAfter = 1355;
        const testMigrateToChat = 88723;

        const testFileId = "debug-file-id";
        const testFilePath = "path/to/tg/data";

        testApiResponse = getApiResponse<TgFile>(
          false,
          {
            file_id: testFileId,
            file_unique_id: "unused-identifier",
            file_path: testFilePath,
          },
          testErrorCode,
          testErrorDescription,
          testRetryAfter,
          testMigrateToChat
        );

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/getFile`);
          expect(config.data).toBeDefined();
          expect(Object.keys(config.data)).toHaveLength(1);
          expect(config.data.file_id).toBe(testFileId);
        };

        return getPromiseError(() => api.getFileLink(testFileId)).then(
          (err) => {
            expect(err.stack).toBeDefined();
            expect(err.message).toBe(`ETELEGRAM ${testErrorDescription}`);
            expect(err.code).toBe(testErrorCode);
            expect(err.url).toBe(`/bot${testApiToken}/getFile`);
            expect(err.response).toBe("");
            expect(err.migrateToChatId).toBe(testMigrateToChat);
            expect(err.retryAfter).toBe(testRetryAfter);
          }
        );
      });

      it("getFileLink no file path", () => {
        const testFileId = "debug-file-id";

        testApiResponse = getApiResponse<TgFile>(true, {
          file_id: testFileId,
          file_unique_id: "unused-identifier",
        });

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/getFile`);
          expect(config.data).toBeDefined();
          expect(Object.keys(config.data)).toHaveLength(1);
          expect(config.data.file_id).toBe(testFileId);
        };

        return getPromiseError(() => api.getFileLink(testFileId)).then(
          (err) => {
            expect(err.stack).toBeDefined();
            expect(err.message).toBe("ETELEGRAM Unable to get the file link");
          }
        );
      });
    });
  });

  describe("http error cases", () => {
    it("simple error, not network", () => {
      const testErrMsg = "oops, we are in trouble";
      const testErr = new Error(testErrMsg);
      jest.spyOn(testClient, "request").mockImplementationOnce(() => {
        return Promise.reject(testErr);
      });

      const testChatId = 3453453;
      const testMessageId = 2345566;
      const testText = "text text text";
      const testChatType = TgChatType.Channel;
      testApiResponse = getApiResponse<TgMessage>(true, {
        date: new Date().getTime(),
        message_id: testMessageId,
        chat: {
          id: testChatId,
          type: testChatType,
        },
      });

      checkApiData = (config) => {
        expect(config.url).toBe(`/bot${testApiToken}/editMessageText`);
        expect(Object.keys(config.data)).toHaveLength(3);
        expect(config.data.chat_id).toBe(testChatId);
        expect(config.data.message_id).toBe(testMessageId);
        expect(config.data.text).toBe(testText);
      };

      return getPromiseError(() =>
        api.editMessageText(testChatId, testMessageId, testText)
      ).then((err) => {
        expect(err.stack).toBeDefined();
        expect(err.message).toBe(`ETELEGRAM ${testErrMsg}`);
        expect(err.code).toBe(0);
        expect(err.url).toBe(`/bot${testApiToken}/editMessageText`);
        expect(err.response).toBe("");
        expect(err.migrateToChatId).toBe(0);
        expect(err.retryAfter).toBe(0);
      });
    });

    it("network error", () => {
      const testErrMsg = "yeah... bad";
      const errCode = 404;
      const errData = "err data";
      const testErr = new Error(testErrMsg);
      jest.spyOn(testClient, "request").mockImplementationOnce(() => {
        const networkErr: AxiosError = {
          stack: testErr.stack,
          message: testErr.message,
          name: testErr.name,
          response: {
            status: errCode,
            statusText: "cool co co cool",
            data: errData,
            config: {},
            headers: {},
            request: {},
          },
          isAxiosError: true,
          request: {},
          config: {},
          toJSON: () => ({}),
        };
        return Promise.reject(networkErr);
      });

      const testChatId = 32422;
      const testText = "op op op";
      const testChatType = TgChatType.SuperGroup;
      testApiResponse = getApiResponse<TgMessage>(true, {
        date: new Date().getTime(),
        message_id: 4353411,
        chat: {
          id: testChatId,
          type: testChatType,
        },
      });

      checkApiData = (config) => {
        expect(config.url).toBe(`/bot${testApiToken}/sendMessage`);
        expect(Object.keys(config.data)).toHaveLength(2);
        expect(config.data.chat_id).toBe(testChatId);
        expect(config.data.text).toBe(testText);
      };

      return getPromiseError(() => api.sendMessage(testChatId, testText)).then(
        (err) => {
          expect(err.stack).toBeDefined();
          expect(err.message).toBe(`ETELEGRAM ${testErrMsg}`);
          expect(err.code).toBe(errCode);
          expect(err.url).toBe(`/bot${testApiToken}/sendMessage`);
          expect(err.response).toBe(errData);
          expect(err.migrateToChatId).toBe(0);
          expect(err.retryAfter).toBe(0);
        }
      );
    });
  });
});
