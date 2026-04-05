import { beforeEach, describe, expect, it, vi } from "vitest";
import { nanoid } from "nanoid";
import type { TgMessage } from "./types.js";
import { TelegramApi } from "./tgapi.js";
import { type TgError } from "./tgerror.js";
import { SANITIZE_CHARACTER } from "../../logger/const.js";
import { TelegramBaseApi } from "./groups/core.js";
import { type BotCommandDto, type TgWebHook } from "./groups/updates/updates-types.js";
import {
  type TgFile,
  type TgInlineKeyboardButton,
  type TgLeaveChatSchema,
} from "./groups/chats/chats-types.js";
import { type TgInvoice } from "./groups/payments/payments-types.js";
import { asChatId__test, asFileId__test, asMessageId__test } from "../../testUtils/types.js";
import type { ChatId } from "./core.js";
import { randomIntFromInterval } from "../../common/timer.js";

const getApiResponse = <Response>(
  ok: boolean,
  result: Response,
  errorCode?: number,
  errorDescription?: string,
  retryAfter?: number,
  migrateChatId?: ChatId,
): string => {
  const hasMeta = migrateChatId || retryAfter;
  return JSON.stringify({
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
  });
};

const getPromiseError = <Err = TgError, R = unknown>(fn: () => Promise<R>): Promise<Err> =>
  new Promise((resolve, reject) => {
    fn().then(
      (data) => reject(new Error("Should fail", { cause: data })),
      (err) => resolve(err),
    );
  });

let testApiToken = nanoid(10);
let testAppId = randomIntFromInterval(1, 100000);
let testAppHash = nanoid(10);

let api = new TelegramApi(testApiToken, testAppId, testAppHash, true);

describe("[telegram api client]", () => {
  beforeEach(() => {
    testApiToken = nanoid(10);
    testAppId = randomIntFromInterval(1, 100000);
    testAppHash = nanoid(10);
    api = new TelegramApi(testApiToken, testAppId, testAppHash, true);
    vi.resetAllMocks();
  });

  it("check request config fields", async () => {
    const testHook = "some-test-hook-url";

    vi.spyOn(global, "fetch").mockImplementation((_, cfg) => {
      if (!cfg) {
        throw new Error("config can not be empty");
      }
      expect(cfg.method).toBe("POST");
      // @ts-expect-error Some mess with header types
      expect(cfg.headers?.get("Accept")).toBe("application/json");
      // @ts-expect-error Some mess with header types
      expect(cfg.headers?.get("Content-Type")).toBe("application/json");
      return Promise.resolve(new Response(getApiResponse<boolean>(true, true), { status: 200 }));
    });

    const isOk = await api.updates.setWebHook(testHook);
    expect(isOk).toBe(true);
  });

  describe("telegram response", () => {
    describe("good cases", () => {
      it("setWebHook", async () => {
        const testHook = "some-test-hook-url";

        vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
          expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/setWebHook`);
          const data = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "");
          expect(data.url).toBe(testHook);
          return Promise.resolve(
            new Response(getApiResponse<boolean>(true, true), { status: 200 }),
          );
        });

        const isOk = await api.updates.setWebHook(testHook);
        expect(isOk).toBe(true);
      });

      it("setMyCommands", async () => {
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

        vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
          expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/setMyCommands`);
          const data = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
            commands: BotCommandDto[];
          };
          expect(data.commands).toBeDefined();
          expect(data.commands).toHaveLength(2);
          data.commands.forEach((cmd, ind) => {
            expect(cmd.command).toBe(testCommands[ind].command);
            expect(cmd.description).toBe(testCommands[ind].description);
          });
          return Promise.resolve(
            new Response(getApiResponse<boolean>(true, true), { status: 200 }),
          );
        });

        const isOk = await api.updates.setMyCommands(testCommands);
        expect(isOk).toBe(true);
      });

      it("getWebHookInfo", async () => {
        const testHook = "some-test-hook-url-tttt";

        vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
          expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/getWebhookInfo`);
          expect(cfg?.body).toBe(undefined);
          return Promise.resolve(
            new Response(
              getApiResponse<TgWebHook>(true, {
                url: testHook,
              }),
              { status: 200 },
            ),
          );
        });

        const data = await api.updates.getWebHookInfo();
        expect(Object.keys(data)).toHaveLength(1);
        expect(data.url).toBe(testHook);
      });

      it("getFileLink", async () => {
        const testChatId = asChatId__test(323426);
        const testFileId = asFileId__test("debug-file-id");
        const testFilePath = "path/to/tg/data";

        vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
          expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/getFile`);
          const data = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
            file_id: string;
          };
          expect(data.file_id).toBe(testFileId);
          return Promise.resolve(
            new Response(
              getApiResponse<TgFile>(true, {
                file_id: testFileId,
                file_unique_id: "unused-identifier",
                file_path: testFilePath,
              }),
              { status: 200 },
            ),
          );
        });

        const fileUrl = await api.chats.getFile(testFileId, testChatId);
        expect(fileUrl).toBe(`${TelegramBaseApi.url}/file/bot${testApiToken}/${testFilePath}`);
      });

      it("editMessageText", async () => {
        const testChatId = asChatId__test(323426);
        const testMessageId = asMessageId__test(657887689);
        const testText = "text-for-edit lalala";
        const testChatType = "private";

        vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
          expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/editMessageText`);
          const data = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
            chat_id: ChatId;
            message_id: number;
            text: string;
            parse_mode: string;
          };
          expect(data.chat_id).toBe(testChatId);
          expect(data.message_id).toBe(testMessageId);
          expect(data.text).toBe(testText);
          expect(data.parse_mode).toBe("HTML");
          return Promise.resolve(
            new Response(
              getApiResponse<TgMessage>(true, {
                date: Date.now(),
                message_id: testMessageId,
                chat: {
                  id: testChatId,
                  type: testChatType,
                },
              }),
              { status: 200 },
            ),
          );
        });

        const data = await api.chats.editMessageText(testChatId, testMessageId, testText);
        expect(data).toBeDefined();
        expect(data.message_id).toBe(testMessageId);
        expect(data.chat.id).toBe(testChatId);
        expect(data.chat.type).toBe(testChatType);
      });

      describe("answerPreCheckoutQuery", () => {
        it("should send data with no error", async () => {
          const queryId = "323426";

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/answerPreCheckoutQuery`);
            const data = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              pre_checkout_query_id: string;
              ok: boolean;
            };
            expect(data).toStrictEqual({
              pre_checkout_query_id: queryId,
              ok: true,
            });
            return Promise.resolve(new Response(getApiResponse(true, true), { status: 200 }));
          });

          const isOk = await api.payments.answerPreCheckoutQuery(asChatId__test(234211), queryId);
          expect(isOk).toBe(true);
        });

        it("should send proper error payload", async () => {
          const queryId = "3243412";
          const errorMessage = "some error message";

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/answerPreCheckoutQuery`);
            const data = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              pre_checkout_query_id: string;
              ok: boolean;
              error_message?: string;
            };
            expect(data).toStrictEqual({
              pre_checkout_query_id: queryId,
              ok: false,
              error_message: errorMessage,
            });
            return Promise.resolve(new Response(getApiResponse(true, true), { status: 200 }));
          });

          const isOk = await api.payments.answerPreCheckoutQuery(
            asChatId__test(234211),
            queryId,
            errorMessage,
          );
          expect(isOk).toBe(true);
        });
      });

      describe("sendInvoice", () => {
        it("should send proper payload", async () => {
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

          const resp: TgMessage = {
            date: Date.now(),
            message_id: asMessageId__test(32411244),
            chat: {
              id: data.chatId,
              type: "private",
            },
          };

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/sendInvoice`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as Record<
              string,
              unknown
            >;
            expect(body).toStrictEqual({
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

            return Promise.resolve(
              new Response(getApiResponse<TgMessage>(true, resp), { status: 200 }),
            );
          });

          const res = await api.payments.sendInvoice(data);
          expect(res).toEqual(resp);
        });
      });

      describe("leaveChat", () => {
        it("should return proper result", async () => {
          const testChatId = asChatId__test(323426);

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/leaveChat`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              chat_id: ChatId;
            };
            expect(body.chat_id).toBe(testChatId);
            return Promise.resolve(
              new Response(getApiResponse<TgLeaveChatSchema>(true, true), { status: 200 }),
            );
          });

          const isOk = await api.chats.leaveChat(testChatId);
          expect(isOk).toBe(true);
        });

        it("should return validation error on wrong response", async () => {
          const testChatId = asChatId__test(323426);

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/leaveChat`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              chat_id: ChatId;
            };
            expect(body.chat_id).toBe(testChatId);
            return Promise.resolve(
              new Response(getApiResponse(true, "broken response"), { status: 200 }),
            );
          });

          const err = await getPromiseError<{ issues: { code: string; message: string }[] }>(() =>
            api.chats.leaveChat(testChatId),
          );
          expect(err.issues[0].code).toBe("invalid_type");
          expect(err.issues[0].message).toBe("Invalid input: expected boolean, received string");
        });
      });

      describe("sendMessage", () => {
        it("no params", async () => {
          const testChatId = asChatId__test(323426);
          const testText = "text-for-edit lalala";
          const testChatType = "private";

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/sendMessage`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              chat_id: ChatId;
              text: string;
              parse_mode: string;
            };
            expect(body.chat_id).toBe(testChatId);
            expect(body.text).toBe(testText);
            expect(body.parse_mode).toBe("HTML");
            return Promise.resolve(
              new Response(
                getApiResponse<TgMessage>(true, {
                  date: Date.now(),
                  message_id: asMessageId__test(32411244),
                  chat: {
                    id: testChatId,
                    type: testChatType,
                  },
                }),
                { status: 200 },
              ),
            );
          });

          const data = await api.chats.sendMessage(testChatId, testText);
          expect(data).toBeDefined();
          expect(data.chat.id).toBe(testChatId);
          expect(data.chat.type).toBe(testChatType);
        });

        it("with button", async () => {
          const testChatId = asChatId__test(323426);
          const testText = "text-for-edit lalala";
          const testChatType = "private";

          const testButton: TgInlineKeyboardButton = {
            text: "cool btn",
            callback_data: "interesting data",
          };

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/sendMessage`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              chat_id: ChatId;
              text: string;
              parse_mode: string;
              reply_markup: {
                inline_keyboard: TgInlineKeyboardButton[][];
              };
            };
            expect(body.chat_id).toBe(testChatId);
            expect(body.text).toBe(testText);
            expect(body.parse_mode).toBe("HTML");
            expect(body.reply_markup.inline_keyboard[0][0].text).toBe(testButton.text);
            expect(body.reply_markup.inline_keyboard[0][0].callback_data).toBe(
              testButton.callback_data,
            );
            return Promise.resolve(
              new Response(
                getApiResponse<TgMessage>(true, {
                  date: Date.now(),
                  message_id: asMessageId__test(32411244),
                  chat: {
                    id: testChatId,
                    type: testChatType,
                  },
                }),
                { status: 200 },
              ),
            );
          });

          const data = await api.chats.sendMessage(testChatId, testText, {
            buttons: [[testButton]],
          });
          expect(data).toBeDefined();
          expect(data.chat.id).toBe(testChatId);
          expect(data.chat.type).toBe(testChatType);
        });

        it("without markup", async () => {
          const testChatId = asChatId__test(323426);
          const testText = "<|~foo_bar~|>";
          const testChatType = "private";

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/sendMessage`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as Record<
              string,
              unknown
            >;
            expect(body.chat_id).toBe(testChatId);
            expect(body.text).toBe(testText);
            expect(body.parse_mode).toBe(undefined);
            expect(body.reply_markup).toBe(undefined);
            return Promise.resolve(
              new Response(
                getApiResponse<TgMessage>(true, {
                  date: Date.now(),
                  message_id: asMessageId__test(32411244),
                  chat: {
                    id: testChatId,
                    type: testChatType,
                  },
                }),
                { status: 200 },
              ),
            );
          });

          const data = await api.chats.sendMessage(testChatId, testText, {
            disableMarkup: true,
          });
          expect(data).toBeDefined();
          expect(data.chat.id).toBe(testChatId);
          expect(data.chat.type).toBe(testChatType);
        });

        it("with button and without markup", async () => {
          const testChatId = asChatId__test(323426);
          const testText = "<|~foo_bar~|>";
          const testChatType = "private";

          const testButton: TgInlineKeyboardButton = {
            text: "cool btn",
            callback_data: "interesting data",
          };

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/sendMessage`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              chat_id: ChatId;
              text: string;
              parse_mode?: string;
              reply_markup: {
                inline_keyboard: TgInlineKeyboardButton[][];
              };
            };
            expect(body.chat_id).toBe(testChatId);
            expect(body.text).toBe(testText);
            expect(body.parse_mode).toBe(undefined);
            expect(body.reply_markup.inline_keyboard[0][0].text).toBe(testButton.text);
            expect(body.reply_markup.inline_keyboard[0][0].callback_data).toBe(
              testButton.callback_data,
            );
            return Promise.resolve(
              new Response(
                getApiResponse<TgMessage>(true, {
                  date: Date.now(),
                  message_id: asMessageId__test(32411244),
                  chat: {
                    id: testChatId,
                    type: testChatType,
                  },
                }),
                { status: 200 },
              ),
            );
          });

          const data = await api.chats.sendMessage(testChatId, testText, {
            buttons: [[testButton]],
            disableMarkup: true,
          });
          expect(data).toBeDefined();
          expect(data.chat.id).toBe(testChatId);
          expect(data.chat.type).toBe(testChatType);
        });

        it("with link", async () => {
          const testChatId = asChatId__test(323426);
          const testText = "text-for-edit lalala";
          const testChatType = "private";

          const testButton: TgInlineKeyboardButton = {
            text: "new link",
            url: "that lnk url",
          };

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/sendMessage`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              chat_id: ChatId;
              text: string;
              parse_mode: string;
              reply_markup: {
                inline_keyboard: TgInlineKeyboardButton[][];
              };
            };
            expect(body.chat_id).toBe(testChatId);
            expect(body.text).toBe(testText);
            expect(body.parse_mode).toBe("HTML");
            expect(body.reply_markup.inline_keyboard[0][0].text).toBe(testButton.text);
            expect(body.reply_markup.inline_keyboard[0][0].url).toBe(testButton.url);
            return Promise.resolve(
              new Response(
                getApiResponse<TgMessage>(true, {
                  date: Date.now(),
                  message_id: asMessageId__test(32411244),
                  chat: {
                    id: testChatId,
                    type: testChatType,
                  },
                }),
                { status: 200 },
              ),
            );
          });

          const data = await api.chats.sendMessage(testChatId, testText, {
            buttons: [[testButton]],
          });
          expect(data).toBeDefined();
          expect(data.chat.id).toBe(testChatId);
          expect(data.chat.type).toBe(testChatType);
        });
      });

      describe("telegram error cases", () => {
        it("telegram returned error code, description", async () => {
          const testErrorCode = 984;
          const testErrorDescription = "Nobody bat an eye";

          const testHook = "some-test-hook-url";

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/setWebHook`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              url: string;
            };
            expect(Object.keys(body)).toHaveLength(1);
            expect(body.url).toBe(testHook);
            return Promise.resolve(
              new Response(
                getApiResponse<boolean>(false, true, testErrorCode, testErrorDescription),
                { status: 200 },
              ),
            );
          });

          const err = await getPromiseError(() => api.updates.setWebHook(testHook));
          expect(err.stack).toBeDefined();
          expect(err.message).toBe(`ETELEGRAM ${testErrorDescription}`);
          expect(err.code).toBe(testErrorCode);
          expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/setWebHook`);
          expect(err.response).toBe(undefined);
          expect(err.migrateToChatId).toBe(0);
          expect(err.retryAfter).toBe(0);
        });

        it("telegram returned error code, description, retryAfter", async () => {
          const testErrorCode = 620;
          const testErrorDescription = "Nobody bat an eye";
          const testRetryAfter = 4456;

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

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/setMyCommands`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              commands: BotCommandDto[];
            };
            expect(Object.keys(body)).toHaveLength(1);
            expect(body.commands).toBeDefined();
            expect(body.commands).toHaveLength(2);
            body.commands.forEach((cmd, ind) => {
              expect(cmd.command).toBe(testCommands[ind].command);
              expect(cmd.description).toBe(testCommands[ind].description);
            });

            return Promise.resolve(
              new Response(
                getApiResponse<boolean>(
                  false,
                  true,
                  testErrorCode,
                  testErrorDescription,
                  testRetryAfter,
                ),
                { status: 200 },
              ),
            );
          });

          const err = await getPromiseError(() => api.updates.setMyCommands(testCommands));
          expect(err.stack).toBeDefined();
          expect(err.message).toBe(`ETELEGRAM ${testErrorDescription}`);
          expect(err.code).toBe(testErrorCode);
          expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/setMyCommands`);
          expect(err.response).toBe(undefined);
          expect(err.migrateToChatId).toBe(0);
          expect(err.retryAfter).toBe(testRetryAfter);
        });

        it("telegram returned error code", async () => {
          const testErrorCode = 253;

          const testHook = "new-h-url";

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/getWebhookInfo`);
            expect(cfg?.body).toBe(undefined);
            return Promise.resolve(
              new Response(getApiResponse<TgWebHook>(false, { url: testHook }, testErrorCode), {
                status: 200,
              }),
            );
          });

          const err = await getPromiseError(() => api.updates.getWebHookInfo());
          expect(err.stack).toBeDefined();
          expect(err.message).toBe("ETELEGRAM Telegram request was unsuccessful");
          expect(err.code).toBe(testErrorCode);
          expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/getWebhookInfo`);
          expect(err.response).toBe(undefined);
          expect(err.migrateToChatId).toBe(0);
          expect(err.retryAfter).toBe(0);
        });

        it("telegram returned error code, description, retryAfter, migrateChatId", async () => {
          const testErrorCode = 918;
          const testErrorDescription = "Really a trouble";
          const testRetryAfter = 1355;
          const testChatId = asChatId__test(323426);
          const testMigrateToChat = asChatId__test(88723);

          const testFileId = asFileId__test("debug-file-id");
          const testFilePath = "path/to/tg/data";

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/getFile`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              file_id: string;
            };
            expect(body.file_id).toBe(testFileId);
            return Promise.resolve(
              new Response(
                getApiResponse<TgFile>(
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
                ),
                { status: 200 },
              ),
            );
          });

          const err = await getPromiseError(() => api.chats.getFile(testFileId, testChatId));
          expect(err.stack).toBeDefined();
          expect(err.message).toBe(`ETELEGRAM ${testErrorDescription}`);
          expect(err.code).toBe(testErrorCode);
          expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/getFile`);
          expect(err.response).toBe(undefined);
          expect(err.migrateToChatId).toBe(testMigrateToChat);
          expect(err.retryAfter).toBe(testRetryAfter);
          expect(err.chatId).toBe(testChatId);
        });

        it("getFileLink no file path", async () => {
          const testFileId = asFileId__test("debug-file-id");
          const testChatId = asChatId__test(323426);

          vi.spyOn(global, "fetch").mockImplementation((url, cfg) => {
            expect(url).toBe(`${TelegramBaseApi.url}/bot${testApiToken}/getFile`);
            const body = JSON.parse(typeof cfg?.body === "string" ? cfg?.body : "") as {
              file_id: string;
            };
            expect(body.file_id).toBe(testFileId);
            return Promise.resolve(
              new Response(
                getApiResponse<TgFile>(true, {
                  file_id: testFileId,
                  file_unique_id: "unused-identifier",
                }),
                { status: 200 },
              ),
            );
          });

          const err = await getPromiseError(() => api.chats.getFile(testFileId, testChatId));
          expect(err.stack).toBeDefined();
          expect(err.chatId).toBe(testChatId);
          expect(err.url).toContain("getFile");
          expect(err.message).toBe("ETELEGRAM Unable to get the file link");
        });
      });

      describe("http error cases", () => {
        it("simple error, not network", async () => {
          const testErrMsg = "oops, we are in trouble";
          const testErr = new Error(testErrMsg);
          vi.spyOn(global, "fetch").mockImplementation(() => Promise.reject(testErr));

          const testChatId = asChatId__test(3453453);
          const testMessageId = asMessageId__test(2345566);
          const testText = "text text text";

          const err = await getPromiseError(() =>
            api.chats.editMessageText(testChatId, testMessageId, testText),
          );
          expect(err.stack).toBeDefined();
          expect(err.message).toBe(`ETELEGRAM ${testErrMsg}`);
          expect(err.code).toBe(0);
          expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/editMessageText`);
          expect(err.response).toBe(undefined);
          expect(err.migrateToChatId).toBe(0);
          expect(err.retryAfter).toBe(0);
        });

        it("network error", async () => {
          const testErrMsg = "Yeah co cool";
          const errCode = 404;
          const errData = { some: "err data" };

          vi.spyOn(global, "fetch").mockImplementationOnce(() => {
            return Promise.resolve(
              new Response(JSON.stringify(errData), {
                status: errCode,
                statusText: testErrMsg,
              }),
            );
          });

          const testChatId = asChatId__test(32422);
          const testText = "op op op";

          const err = await getPromiseError(() => api.chats.sendMessage(testChatId, testText));
          expect(err.stack).toBeDefined();
          expect(err.message).toBe(`ETELEGRAM ${testErrMsg}`);
          expect(err.code).toBe(errCode);
          expect(err.url).toBe(`/bot${SANITIZE_CHARACTER}/sendMessage`);
          expect(err.response).toStrictEqual(errData);
          expect(err.migrateToChatId).toBe(0);
          expect(err.retryAfter).toBe(0);
        });
      });
    });
  });
});
