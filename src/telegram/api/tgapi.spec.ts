import { beforeEach, describe, expect, it, vi } from "vitest";
import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type CreateAxiosDefaults,
} from "axios";
import { nanoid } from "nanoid";
import { type TgCore, type TgMessage } from "./types.js";
import { TelegramApi } from "./tgapi.js";
import { type TgError } from "./tgerror.js";
import { SANITIZE_CHARACTER } from "../../logger/const.js";
import { TelegramBaseApi } from "./groups/core.js";
import {
  type BotCommandDto,
  type TgWebHook,
} from "./groups/updates/updates-types.js";
import {
  type TgFile,
  type TgInlineKeyboardButton,
  type TgLeaveChatSchema,
} from "./groups/chats/chats-types.js";
import { type TgInvoice } from "./groups/payments/payments-types.js";
import {
  asChatId__test,
  asFileId__test,
  asMessageId__test,
} from "../../testUtils/types.js";
import type { ChatId } from "./core.js";
import { randomIntFromInterval } from "../../common/timer.js";

const getApiResponse = <Response>(
  ok: boolean,
  result: Response,
  errorCode?: number,
  errorDescription?: string,
  retryAfter?: number,
  migrateChatId?: ChatId,
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

const getPromiseError = <R>(fn: () => Promise<R>): Promise<TgError> =>
  new Promise((resolve, reject) => {
    fn().then(
      (data) => reject(data),
      (err) => resolve(err),
    );
  });

let testApiToken = nanoid(10);
let testAppId = randomIntFromInterval(1, 100000);
let testAppHash = nanoid(10);

let api = new TelegramApi(testApiToken, testAppId, testAppHash);

let checkApiData = (config: AxiosRequestConfig): void => {
  throw new Error(`Initialize check api data ${JSON.stringify(config)}`);
};

let testApiResponse: TgCore<unknown>;

const clientSpy = vi
  .spyOn(axios, "create")
  .mockImplementation((config?: CreateAxiosDefaults) => {
    if (!config) {
      throw new Error("config can not be empty");
    }
    expect(config.baseURL).toBe(TelegramBaseApi.url);
    expect(config.timeout).toBe(TelegramBaseApi.timeout);
    expect(config.method).toBe("POST");
    expect(config.responseType).toBe("json");
    // @ts-expect-error Some mess with header types
    expect(config.headers?.Accept).toBe("application/json");
    expect(config.headers?.["Content-Type"]).toBe("application/json");
    return testClient;
  });

describe("[telegram api client]", () => {
  beforeEach(() => {
    clientSpy.mockClear();
    testApiToken = nanoid(10);
    testAppId = randomIntFromInterval(1, 100000);
    testAppHash = nanoid(10);
    api = new TelegramApi(testApiToken, testAppId, testAppHash);
  });

  describe("telegram response", () => {
    beforeEach(() => {
      vi.spyOn(testClient, "request").mockImplementationOnce((config) => {
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

        return api.updates.setWebHook(testHook).then((isOk) => {
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

        return api.updates.setMyCommands(testCommands).then((isOk) => {
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

        return api.updates.getWebHookInfo().then((data) => {
          expect(Object.keys(data)).toHaveLength(1);
          expect(data.url).toBe(testHook);
        });
      });

      it("getFileLink", () => {
        const testChatId = asChatId__test(323426);
        const testFileId = asFileId__test("debug-file-id");
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

        return api.chats.getFile(testFileId, testChatId).then((fileUrl) => {
          expect(fileUrl).toBe(
            `${TelegramBaseApi.url}/file/bot${testApiToken}/${testFilePath}`,
          );
        });
      });

      it("editMessageText", () => {
        const testChatId = asChatId__test(323426);
        const testMessageId = asMessageId__test(657887689);
        const testText = "text-for-edit lalala";
        const testChatType = "private";
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
          expect(Object.keys(config.data)).toHaveLength(4);
          expect(config.data.chat_id).toBe(testChatId);
          expect(config.data.message_id).toBe(testMessageId);
          expect(config.data.text).toBe(testText);
          expect(config.data.parse_mode).toBe("HTML");
        };

        return api.chats
          .editMessageText(testChatId, testMessageId, testText)
          .then((data) => {
            expect(data).toBeDefined();
            expect(data.message_id).toBe(testMessageId);
            expect(data.chat.id).toBe(testChatId);
            expect(data.chat.type).toBe(testChatType);
          });
      });

      describe("answerPreCheckoutQuery", () => {
        it("should send data with no error", () => {
          const queryId = "323426";
          testApiResponse = getApiResponse(true, true);

          checkApiData = (config) => {
            expect(config.url).toBe(
              `/bot${testApiToken}/answerPreCheckoutQuery`,
            );
            expect(config.data).toStrictEqual({
              pre_checkout_query_id: queryId,
              ok: true,
              error_message: undefined,
            });
          };

          return api.payments.answerPreCheckoutQuery(
            asChatId__test(234211),
            queryId,
          );
        });

        it("should send proper error payload", () => {
          const queryId = "3243412";
          const errMessage = "some error message";
          testApiResponse = getApiResponse(true, true);

          checkApiData = (config) => {
            expect(config.url).toBe(
              `/bot${testApiToken}/answerPreCheckoutQuery`,
            );
            expect(config.data).toStrictEqual({
              pre_checkout_query_id: queryId,
              ok: false,
              error_message: errMessage,
            });
          };

          return api.payments.answerPreCheckoutQuery(
            asChatId__test(234211),
            queryId,
            errMessage,
          );
        });
      });

      describe("sendInvoice", () => {
        it("should send proper payload", () => {
          const data: TgInvoice = {
            amount: 1900,
            currency: "EUR",
            chatId: asChatId__test(234211),
            description: "Invoice reason description",
            label: "Invoice for stuff",
            meta: "Helpful meta",
            payload: "External payload",
            photo: {
              url: "https://some.image.url",
              height: 1024,
              width: 768,
            },
            title: "donate",
            token: "payment-token",
          };
          testApiResponse = getApiResponse<TgMessage>(true, {
            date: new Date().getTime(),
            message_id: asMessageId__test(32411244),
            chat: {
              id: data.chatId,
              type: "private",
            },
          });

          checkApiData = (config) => {
            expect(config.url).toBe(`/bot${testApiToken}/sendInvoice`);
            expect(config.data).toStrictEqual({
              chat_id: data.chatId,
              currency: "EUR",
              description: data.description,
              payload: data.payload,
              photo_height: data.photo.height,
              photo_url: data.photo.url,
              photo_width: data.photo.width,
              prices: [
                {
                  amount: data.amount,
                  label: data.label,
                },
              ],
              provider_token: data.token,
              start_parameter: data.meta,
              title: data.title,
            });
          };

          return api.payments.sendInvoice(data);
        });
      });

      describe("leaveChat", () => {
        it("should return proper result", () => {
          const testChatId = asChatId__test(323426);
          testApiResponse = getApiResponse<TgLeaveChatSchema>(true, true);

          checkApiData = (config) => {
            expect(config.url).toBe(`/bot${testApiToken}/leaveChat`);
            expect(config.data.chat_id).toBe(testChatId);
          };

          return api.chats.leaveChat(testChatId).then((data) => {
            expect(data).toBe(true);
          });
        });

        it("should return proper result?", () => {
          const testChatId = asChatId__test(323426);
          testApiResponse = getApiResponse(true, "broken response");

          checkApiData = (config) => {
            expect(config.url).toBe(`/bot${testApiToken}/leaveChat`);
            expect(config.data.chat_id).toBe(testChatId);
          };

          return api.chats.leaveChat(testChatId).then(
            () => {
              throw new Error(
                "should not resolve, should receive validation error",
              );
            },
            (err) => {
              expect(err.issues[0].code).toBe("invalid_type");
              expect(err.issues[0].message).toBe(
                "Expected boolean, received string",
              );
            },
          );
        });
      });

      it("sendMessage no params", () => {
        const testChatId = asChatId__test(323426);
        const testText = "text-for-edit lalala";
        const testChatType = "private";
        testApiResponse = getApiResponse<TgMessage>(true, {
          date: new Date().getTime(),
          message_id: asMessageId__test(32411244),
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
          expect(config.data.parse_mode).toBe("HTML");
        };

        return api.chats.sendMessage(testChatId, testText).then((data) => {
          expect(data).toBeDefined();
          expect(data.chat.id).toBe(testChatId);
          expect(data.chat.type).toBe(testChatType);
        });
      });

      it("sendMessage with button", () => {
        const testChatId = asChatId__test(323426);
        const testText = "text-for-edit lalala";
        const testChatType = "private";

        const testButton: TgInlineKeyboardButton = {
          text: "cool btn",
          callback_data: "interesting data",
        };
        testApiResponse = getApiResponse<TgMessage>(true, {
          date: new Date().getTime(),
          message_id: asMessageId__test(32411244),
          chat: {
            id: testChatId,
            type: testChatType,
          },
        });

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/sendMessage`);
          expect(Object.keys(config.data)).toHaveLength(4);
          expect(config.data.chat_id).toBe(testChatId);
          expect(config.data.text).toBe(testText);
          expect(config.data.parse_mode).toBe("HTML");
          expect(config.data.reply_markup.inline_keyboard[0][0].text).toBe(
            testButton.text,
          );
          expect(
            config.data.reply_markup.inline_keyboard[0][0].callback_data,
          ).toBe(testButton.callback_data);
        };

        return api.chats
          .sendMessage(testChatId, testText, { buttons: [[testButton]] })
          .then((data) => {
            expect(data).toBeDefined();
            expect(data.chat.id).toBe(testChatId);
            expect(data.chat.type).toBe(testChatType);
          });
      });

      it("sendMessage without markup", () => {
        const testChatId = asChatId__test(323426);
        const testText = "<|~foo_bar~|>";
        const testChatType = "private";

        testApiResponse = getApiResponse<TgMessage>(true, {
          date: new Date().getTime(),
          message_id: asMessageId__test(32411244),
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
          expect(config.data.parse_mode).toBe(undefined);
          expect(config.data.reply_markup).toBe(undefined);
        };

        return api.chats
          .sendMessage(testChatId, testText, { disableMarkup: true })
          .then((data) => {
            expect(data).toBeDefined();
            expect(data.chat.id).toBe(testChatId);
            expect(data.chat.type).toBe(testChatType);
          });
      });

      it("sendMessage with button and without markup", () => {
        const testChatId = asChatId__test(323426);
        const testText = "<|~foo_bar~|>";
        const testChatType = "private";

        const testButton: TgInlineKeyboardButton = {
          text: "cool btn",
          callback_data: "interesting data",
        };
        testApiResponse = getApiResponse<TgMessage>(true, {
          date: new Date().getTime(),
          message_id: asMessageId__test(32411244),
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
          expect(config.data.parse_mode).toBe(undefined);
          expect(config.data.reply_markup.inline_keyboard[0][0].text).toBe(
            testButton.text,
          );
          expect(
            config.data.reply_markup.inline_keyboard[0][0].callback_data,
          ).toBe(testButton.callback_data);
        };

        return api.chats
          .sendMessage(testChatId, testText, {
            buttons: [[testButton]],
            disableMarkup: true,
          })
          .then((data) => {
            expect(data).toBeDefined();
            expect(data.chat.id).toBe(testChatId);
            expect(data.chat.type).toBe(testChatType);
          });
      });

      it("sendMessage with link", () => {
        const testChatId = asChatId__test(323426);
        const testText = "text-for-edit lalala";
        const testChatType = "private";

        const testButton: TgInlineKeyboardButton = {
          text: "new link",
          url: "that lnk url",
        };
        testApiResponse = getApiResponse<TgMessage>(true, {
          date: new Date().getTime(),
          message_id: asMessageId__test(32411244),
          chat: {
            id: testChatId,
            type: testChatType,
          },
        });

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/sendMessage`);
          expect(Object.keys(config.data)).toHaveLength(4);
          expect(config.data.chat_id).toBe(testChatId);
          expect(config.data.text).toBe(testText);
          expect(config.data.parse_mode).toBe("HTML");
          expect(config.data.reply_markup.inline_keyboard[0][0].text).toBe(
            testButton.text,
          );
          expect(config.data.reply_markup.inline_keyboard[0][0].url).toBe(
            testButton.url,
          );
        };

        return api.chats
          .sendMessage(testChatId, testText, { buttons: [[testButton]] })
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
          testErrorDescription,
        );
        const testHook = "some-test-hook-url";
        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/setWebHook`);
          expect(Object.keys(config.data)).toHaveLength(1);
          expect(config.data.url).toBe(testHook);
        };

        return getPromiseError(() => api.updates.setWebHook(testHook)).then(
          (err) => {
            expect(err.stack).toBeDefined();
            expect(err.message).toBe(`ETELEGRAM ${testErrorDescription}`);
            expect(err.code).toBe(testErrorCode);
            expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/setWebHook`);
            expect(err.response).toBe(undefined);
            expect(err.migrateToChatId).toBe(0);
            expect(err.retryAfter).toBe(0);
          },
        );
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
          testRetryAfter,
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

        return getPromiseError(() =>
          api.updates.setMyCommands(testCommands),
        ).then((err) => {
          expect(err.stack).toBeDefined();
          expect(err.message).toBe(`ETELEGRAM ${testErrorDescription}`);
          expect(err.code).toBe(testErrorCode);
          expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/setMyCommands`);
          expect(err.response).toBe(undefined);
          expect(err.migrateToChatId).toBe(0);
          expect(err.retryAfter).toBe(testRetryAfter);
        });
      });

      it("telegram returned error code", () => {
        const testErrorCode = 253;

        const testHook = "new-h-url";

        testApiResponse = getApiResponse<TgWebHook>(
          false,
          { url: testHook },
          testErrorCode,
        );

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/getWebhookInfo`);
          expect(config.data).not.toBeDefined();
        };

        return getPromiseError(() => api.updates.getWebHookInfo()).then(
          (err) => {
            expect(err.stack).toBeDefined();
            expect(err.message).toBe(
              "ETELEGRAM Telegram request was unsuccessful",
            );
            expect(err.code).toBe(testErrorCode);
            expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/getWebhookInfo`);
            expect(err.response).toBe(undefined);
            expect(err.migrateToChatId).toBe(0);
            expect(err.retryAfter).toBe(0);
          },
        );
      });

      it("telegram returned error code, description, retryAfter, migrateChatId", () => {
        const testErrorCode = 918;
        const testErrorDescription = "Really a trouble";
        const testRetryAfter = 1355;
        const testChatId = asChatId__test(323426);
        const testMigrateToChat = asChatId__test(88723);

        const testFileId = asFileId__test("debug-file-id");
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
          testMigrateToChat,
        );

        checkApiData = (config) => {
          expect(config.url).toBe(`/bot${testApiToken}/getFile`);
          expect(config.data).toBeDefined();
          expect(Object.keys(config.data)).toHaveLength(1);
          expect(config.data.file_id).toBe(testFileId);
        };

        return getPromiseError(() =>
          api.chats.getFile(testFileId, testChatId),
        ).then((err) => {
          expect(err.stack).toBeDefined();
          expect(err.message).toBe(`ETELEGRAM ${testErrorDescription}`);
          expect(err.code).toBe(testErrorCode);
          expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/getFile`);
          expect(err.response).toBe(undefined);
          expect(err.migrateToChatId).toBe(testMigrateToChat);
          expect(err.retryAfter).toBe(testRetryAfter);
          expect(err.chatId).toBe(testChatId);
        });
      });

      it("getFileLink no file path", () => {
        const testFileId = asFileId__test("debug-file-id");
        const testChatId = asChatId__test(323426);

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

        return getPromiseError(() =>
          api.chats.getFile(testFileId, testChatId),
        ).then((err) => {
          expect(err.stack).toBeDefined();
          expect(err.chatId).toBe(testChatId);
          expect(err.url).toContain("getFile");
          expect(err.message).toBe("ETELEGRAM Unable to get the file link");
        });
      });
    });
  });

  describe("http error cases", () => {
    it("simple error, not network", () => {
      const testErrMsg = "oops, we are in trouble";
      const testErr = new Error(testErrMsg);
      vi.spyOn(testClient, "request").mockImplementationOnce(() => {
        return Promise.reject(testErr);
      });

      const testChatId = asChatId__test(3453453);
      const testMessageId = asMessageId__test(2345566);
      const testText = "text text text";
      const testChatType = "channel";
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
        expect(Object.keys(config.data)).toHaveLength(4);
        expect(config.data.chat_id).toBe(testChatId);
        expect(config.data.message_id).toBe(testMessageId);
        expect(config.data.text).toBe(testText);
        expect(config.data.parse_mode).toBe("HTML");
      };

      return getPromiseError(() =>
        api.chats.editMessageText(testChatId, testMessageId, testText),
      ).then((err) => {
        expect(err.stack).toBeDefined();
        expect(err.message).toBe(`ETELEGRAM ${testErrMsg}`);
        expect(err.code).toBe(0);
        expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/editMessageText`);
        expect(err.response).toBe(undefined);
        expect(err.migrateToChatId).toBe(0);
        expect(err.retryAfter).toBe(0);
      });
    });

    it("network error", () => {
      const testErrMsg = "yeah... bad";
      const errCode = 404;
      const errData = "err data";
      const testErr = new Error(testErrMsg);
      vi.spyOn(testClient, "request").mockImplementationOnce(() => {
        const networkErr: AxiosError = {
          stack: testErr.stack,
          message: testErr.message,
          name: testErr.name,
          response: {
            status: errCode,
            statusText: "cool co co cool",
            data: errData,
            config: {
              headers: new AxiosHeaders(),
            },
            headers: {},
            request: {},
          },
          isAxiosError: true,
          request: {},
          config: {
            headers: new AxiosHeaders(),
          },
          toJSON: () => ({}),
        };
        return Promise.reject(networkErr);
      });

      const testChatId = asChatId__test(32422);
      const testText = "op op op";
      const testChatType = "supergroup";
      testApiResponse = getApiResponse<TgMessage>(true, {
        date: new Date().getTime(),
        message_id: asMessageId__test(4353411),
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
        expect(config.data.parse_mode).toBe("HTML");
      };

      return getPromiseError(() =>
        api.chats.sendMessage(testChatId, testText),
      ).then((err) => {
        expect(err.stack).toBeDefined();
        expect(err.message).toBe(`ETELEGRAM ${testErrMsg}`);
        expect(err.code).toBe(errCode);
        expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/sendMessage`);
        expect(err.response).toBe(errData);
        expect(err.migrateToChatId).toBe(0);
        expect(err.retryAfter).toBe(0);
      });
    });
  });
});
