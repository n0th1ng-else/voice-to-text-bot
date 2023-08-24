import { resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "@jest/globals";
import request from "supertest";
import nock from "nock";
import querystring from "query-string";
import { TelegramBotModel } from "../../src/telegram/bot.js";
import {
  TelegramMessageMetaItem,
  TelegramMessageMetaType,
  TelegramMessageModel,
} from "../helpers.js";
import { TextModel } from "../../src/text/index.js";
import { LabelId, type LabelWithNoMenu } from "../../src/text/types.js";
import { botCommands } from "../../src/telegram/data.js";
import { flattenPromise } from "../../src/common/helpers.js";
import { TelegramButtonModel } from "../../src/telegram/types.js";
import { parseDonationPayload } from "../../src/telegram/helpers.js";
import type { TgUpdate } from "../../src/telegram/api/types.js";
import type { LanguageCode } from "../../src/recognition/types.js";

const text = new TextModel();
const telegramApiResponseOk = JSON.stringify({ ok: true });

const makeTelegramResponse = <D>(result: D) => {
  return [200, JSON.stringify({ ok: true, result })];
};

export const sendTelegramMessage = (
  host: request.SuperTest<request.Test>,
  bot: TelegramBotModel,
  msg: TelegramMessageModel,
): Promise<void> => {
  const payload: TgUpdate = {
    update_id: 12434,
    message: msg.toApi(),
  };
  return host
    .post(bot.getPath())
    .send(payload)
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });
};

export const sendTelegramCallbackMessage = (
  host: request.SuperTest<request.Test>,
  bot: TelegramBotModel,
  msg: TelegramMessageModel,
): Promise<void> => {
  const payload: TgUpdate = {
    update_id: 12434,
    callback_query: msg.toCallbackApi(),
  };
  return host
    .post(bot.getPath())
    .send(payload)
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });
};

export const mockTgSetCommands = (host: nock.Scope): void => {
  host.post("/bottelegram-api-token/setMyCommands").reply((uri, body) => {
    const answer = typeof body === "string" ? querystring.parse(body) : body;
    expect(answer.commands).toBeDefined();
    const commands = answer.commands;
    expect(commands).toHaveLength(botCommands.length);

    botCommands.forEach((botCommand, ind) => {
      expect(commands[ind].command).toBe(botCommand.command);
      expect(commands[ind].description).toBe(botCommand.description);
    });
    return [200, telegramApiResponseOk];
  });
};

export const mockTgSetWebHook = (host: nock.Scope, hookUrl: string): void => {
  host.post("/bottelegram-api-token/setWebHook").reply((uri, body) => {
    const answer = typeof body === "string" ? querystring.parse(body) : body;
    expect(answer.url).toBe(hookUrl);
    return makeTelegramResponse(true);
  });
};

export const mockTgGetWebHook = (host: nock.Scope, hookUrl: string): void => {
  host.post("/bottelegram-api-token/getWebhookInfo").reply(() => {
    return makeTelegramResponse({ url: hookUrl });
  });
};

export const mockTgGetWebHookError = (host: nock.Scope): void => {
  host.post("/bottelegram-api-token/getWebhookInfo").replyWithError({
    status: 503,
    message: "Telegram webhook is off",
  });
};

export const mockTgReceiveUnexpectedMessage = (
  host: nock.Scope,
  done,
): void => {
  host
    .post("/bottelegram-api-token/sendMessage")
    .reply(500, () => done.fail(new Error("The message is not expected")));
};

export const mockTgReceiveRawMessage = (
  host: nock.Scope,
  chatId: number,
  lang: LanguageCode,
  message: string,
): Promise<void> => {
  return new Promise((resolve) => {
    host.post("/bottelegram-api-token/sendMessage").reply(200, (uri, body) => {
      const answer = typeof body === "string" ? querystring.parse(body) : body;
      expect(answer.chat_id).toBe(chatId);
      expect(answer.text).toBe(message);
      resolve();
      return telegramApiResponseOk;
    });
  });
};

export const mockTgReceiveMessage = (
  host: nock.Scope,
  chatId: number,
  lang: LanguageCode,
  textId: LabelWithNoMenu,
  expectedMarkup: TelegramMessageMetaItem[][] = [],
): Promise<string> => {
  return new Promise<string>((resolve) => {
    host.post("/bottelegram-api-token/sendMessage").reply(200, (uri, body) => {
      const answer = typeof body === "string" ? querystring.parse(body) : body;
      expect(answer.chat_id).toBe(chatId);
      expect(answer.text).toBe(text.t(textId, lang));
      let prefixId = "";

      if (expectedMarkup.length) {
        expect(answer.reply_markup).toBeDefined();
        const receivedMarkup = answer.reply_markup.inline_keyboard;
        expect(receivedMarkup).toBeDefined();

        expect(receivedMarkup).toHaveLength(expectedMarkup.length);

        receivedMarkup.forEach((receivedLine, ind) => {
          const expectedLine = expectedMarkup[ind];
          expect(receivedLine).toBeDefined();
          expect(expectedLine).toBeDefined();
          receivedLine.forEach((receivedItem, indx) => {
            const expectedItem = expectedLine[indx];
            expect(receivedItem).toBeDefined();
            expect(expectedItem).toBeDefined();

            expect(receivedItem.text).toBe(
              typeof expectedItem.title === "string"
                ? expectedItem.title
                : text.t(expectedItem.title, lang),
            );

            if (expectedItem.type === TelegramMessageMetaType.Button) {
              const btnData = TelegramButtonModel.fromDto(
                receivedItem.callback_data,
              );

              expect(btnData.value).toBe(expectedItem.data);
              expect(btnData.logPrefix).toBeDefined();
              expect(btnData.id).toBe(expectedItem.btnType);
              prefixId = btnData.logPrefix;
            } else if (expectedItem.type === TelegramMessageMetaType.Link) {
              expect(receivedItem.url).toBe(expectedItem.data);
            } else {
              throw new Error("type is not defined");
            }
          });
        });
      } else {
        expect(answer.reply_markup).not.toBeDefined();
      }
      resolve(prefixId);
      return telegramApiResponseOk;
    });
  });
};

export const mockTgReceiveMessages = (
  host: nock.Scope,
  chatId: number,
  lang: LanguageCode,
  textIds: LabelWithNoMenu[],
): Promise<void> => {
  return Promise.all(
    textIds.map((textId) => mockTgReceiveMessage(host, chatId, lang, textId)),
  ).then(flattenPromise);
};

export const mockTgGetFileUrl = (host: nock.Scope, fileId: string): void => {
  const pathToFile = `super/path/to/file/${fileId}`;
  const fullPathToFile = `/file/bottelegram-api-token/${pathToFile}`;

  host.post("/bottelegram-api-token/getFile").reply(200, (uri, body) => {
    const answer = typeof body === "string" ? querystring.parse(body) : body;
    expect(answer.file_id).toBe(fileId);
    return JSON.stringify({ ok: true, result: { file_path: pathToFile } });
  });

  const currentDir = fileURLToPath(new URL(".", import.meta.url));
  host
    .get(fullPathToFile)
    .replyWithFile(
      200,
      resolvePath(currentDir, "..", "mockData", "sample_file.oga"),
      {
        "Content-Type": "audio/ogg",
      },
    );
};

export const mockTgReceiveCallbackMessage = (
  host: nock.Scope,
  chatId: number,
  messageId: number,
  langId: LanguageCode,
  textId: LabelWithNoMenu,
  expectedMarkup: TelegramMessageMetaItem[][] = [],
): Promise<void> => {
  return new Promise((resolve) => {
    host
      .post("/bottelegram-api-token/editMessageText")
      .reply(200, (uri, body) => {
        const answer =
          typeof body === "string" ? querystring.parse(body) : body;
        expect(answer.chat_id).toBe(chatId);
        expect(answer.text).toBe(text.t(textId, langId));
        expect(answer.message_id).toBe(messageId);

        if (expectedMarkup.length) {
          expect(answer.reply_markup).toBeDefined();
          const receivedMarkup = answer.reply_markup.inline_keyboard;
          expect(receivedMarkup).toBeDefined();

          expect(receivedMarkup).toHaveLength(expectedMarkup.length);

          receivedMarkup.forEach((receivedLine, ind) => {
            const expectedLine = expectedMarkup[ind];
            expect(receivedLine).toBeDefined();
            expect(expectedLine).toBeDefined();
            receivedLine.forEach((receivedItem, indx) => {
              const expectedItem = expectedLine[indx];
              expect(receivedItem).toBeDefined();
              expect(expectedItem).toBeDefined();

              expect(receivedItem.text).toBe(
                typeof expectedItem.title === "string"
                  ? expectedItem.title
                  : text.t(expectedItem.title, langId),
              );

              if (expectedItem.type === TelegramMessageMetaType.Button) {
                const btnData = TelegramButtonModel.fromDto(
                  receivedItem.callback_data,
                );

                expect(btnData.value).toBe(expectedItem.data);
                expect(btnData.logPrefix).toBeDefined();
                expect(btnData.id).toBe(expectedItem.btnType);
              } else if (expectedItem.type === TelegramMessageMetaType.Link) {
                expect(receivedItem.url).toContain(expectedItem.data); // TODO
              } else {
                throw new Error("type is not defined");
              }
            });
          });
        } else {
          expect(answer.reply_markup).not.toBeDefined();
        }
        resolve();
        return telegramApiResponseOk;
      });
  });
};

export const mockTgReceiveInvoiceMessage = (
  host: nock.Scope,
  chatId: number,
  messageId: number,
  langId: LanguageCode,
  paymentToken: string,
  donationId: number,
  price: number,
): Promise<void> => {
  return new Promise((resolve) => {
    host.post("/bottelegram-api-token/sendInvoice").reply(200, (uri, body) => {
      const answer = typeof body === "string" ? querystring.parse(body) : body;

      expect(answer.chat_id).toBe(chatId);
      expect(answer.currency).toBe("EUR");
      expect(answer.provider_token).toBe(paymentToken);
      expect(answer.start_parameter).toBe(String(donationId));
      const payload = parseDonationPayload(answer.payload);
      expect(payload.chatId).toBe(chatId);
      expect(payload.donationId).toBe(donationId);
      expect(payload.prefix).toBeDefined();

      expect(answer.title).toBe(text.t(LabelId.DonationTitle, langId));
      expect(answer.description).toBe(
        text.t(LabelId.DonationDescription, langId),
      );
      expect(answer.prices).toHaveLength(1);
      expect(answer.prices[0].amount).toBe(price * 100);
      expect(answer.prices[0].label).toBe(
        text.t(LabelId.DonationLabel, langId),
      );

      resolve();
      return telegramApiResponseOk;
    });
  });
};
