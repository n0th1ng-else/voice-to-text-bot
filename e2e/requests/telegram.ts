import { expect } from "@jest/globals";
import { resolve as resolvePath } from "path";
import request from "supertest";
import nock from "nock";
import { parse } from "query-string";
import { TelegramBotModel } from "../../src/telegram/bot";
import {
  TelegramMessageMetaItem,
  TelegramMessageMetaType,
  TelegramMessageModel,
} from "../helpers";
import { TextModel } from "../../src/text";
import { LanguageCode } from "../../src/recognition/types";
import { LabelId } from "../../src/text/labels";
import { botCommands } from "../../src/telegram/data";
import { flattenPromise } from "../../src/common/helpers";
import { TelegramButtonModel } from "../../src/telegram/types";

const text = new TextModel();
const telegramApiResponseOk = JSON.stringify({ ok: true });

export function sendTelegramMessage(
  host: request.SuperTest<request.Test>,
  bot: TelegramBotModel,
  msg: TelegramMessageModel
): Promise<void> {
  return host
    .post(bot.getPath())
    .send({
      message: msg.toApi(),
    })
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });
}

export function sendTelegramCallbackMessage(
  host: request.SuperTest<request.Test>,
  bot: TelegramBotModel,
  msg: TelegramMessageModel
): Promise<void> {
  return host
    .post(bot.getPath())
    .send({
      callback_query: msg.toCallbackApi(),
    })
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });
}

export function mockTgSetCommands(host: nock.Scope): void {
  host.post("/bottelegram-api-token/setMyCommands").reply((uri, body) => {
    const answer = typeof body === "string" ? parse(body) : body;
    expect(answer.commands).toBeDefined();
    const commands = answer.commands;
    expect(commands).toHaveLength(botCommands.length);

    botCommands.forEach((botCommand, ind) => {
      expect(commands[ind].command).toBe(botCommand.command);
      expect(commands[ind].description).toBe(botCommand.description);
    });
    return [200, telegramApiResponseOk];
  });
}

export function mockTgSetWebHook(host: nock.Scope, hookUrl: string): void {
  host.post("/bottelegram-api-token/setWebHook").reply(200, (uri, body) => {
    const answer = typeof body === "string" ? parse(body) : body;
    expect(answer.url).toBe(hookUrl);
    return telegramApiResponseOk;
  });
}

export function mockTgGetWebHook(host: nock.Scope, hookUrl: string): void {
  host
    .post("/bottelegram-api-token/getWebhookInfo")
    .reply(200, JSON.stringify({ ok: true, result: { url: hookUrl } }));
}

export function mockTgGetWebHookError(host: nock.Scope): void {
  host.post("/bottelegram-api-token/getWebhookInfo").replyWithError({
    status: 503,
    message: "Telegram webhook is off",
  });
}

export function mockTgReceiveUnexpectedMessage(host: nock.Scope, done): void {
  host
    .post("/bottelegram-api-token/sendMessage")
    .reply(500, () => done.fail(new Error("The message is not expected")));
}

export function mockTgReceiveRawMessage(
  host: nock.Scope,
  chatId: number,
  lang: LanguageCode,
  message: string
): Promise<void> {
  return new Promise((resolve) => {
    host.post("/bottelegram-api-token/sendMessage").reply(200, (uri, body) => {
      const answer = typeof body === "string" ? parse(body) : body;
      expect(answer.chat_id).toBe(chatId);
      expect(answer.text).toBe(message);
      resolve();
      return telegramApiResponseOk;
    });
  });
}

export function mockTgReceiveMessage(
  host: nock.Scope,
  chatId: number,
  lang: LanguageCode,
  textId: LabelId,
  expectedMarkup: TelegramMessageMetaItem[][] = []
): Promise<string> {
  return new Promise<string>((resolve) => {
    host.post("/bottelegram-api-token/sendMessage").reply(200, (uri, body) => {
      const answer = typeof body === "string" ? parse(body) : body;
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

            expect(receivedItem.text).toBe(text.t(expectedItem.title, lang));

            if (expectedItem.type === TelegramMessageMetaType.Button) {
              const btnData = TelegramButtonModel.fromDto(
                receivedItem.callback_data
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
}

export function mockTgReceiveMessages(
  host: nock.Scope,
  chatId: number,
  lang: LanguageCode,
  textIds: LabelId[]
): Promise<void> {
  return Promise.all(
    textIds.map((textId) => mockTgReceiveMessage(host, chatId, lang, textId))
  ).then(flattenPromise);
}

export function mockTgGetFileUrl(host: nock.Scope, fileId: string): void {
  const pathToFile = `super/path/to/file/${fileId}`;
  const fullPathToFile = `/file/bottelegram-api-token/${pathToFile}`;

  host.post("/bottelegram-api-token/getFile").reply(200, (uri, body) => {
    const answer = typeof body === "string" ? parse(body) : body;
    expect(answer.file_id).toBe(fileId);
    return JSON.stringify({ ok: true, result: { file_path: pathToFile } });
  });

  host
    .get(fullPathToFile)
    .replyWithFile(
      200,
      resolvePath(__dirname, "..", "mockData", "sample_file.oga"),
      {
        "Content-Type": "audio/ogg",
      }
    );
}

export function mockTgReceiveCallbackMessage(
  host: nock.Scope,
  chatId: number,
  messageId: number,
  langId: LanguageCode,
  textId: LabelId,
  expectedMarkup: TelegramMessageMetaItem[][] = []
): Promise<void> {
  return new Promise((resolve) => {
    host
      .post("/bottelegram-api-token/editMessageText")
      .reply(200, (uri, body) => {
        const answer = typeof body === "string" ? parse(body) : body;
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
                text.t(expectedItem.title, langId)
              );

              if (expectedItem.type === TelegramMessageMetaType.Button) {
                const btnData = TelegramButtonModel.fromDto(
                  receivedItem.callback_data
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
}
