import { expect } from "@jest/globals";
import { resolve as resolvePath } from "path";
import request from "supertest";
import nock from "nock";
import { parse } from "query-string";
import { TelegramBotModel } from "../../src/telegram/bot";
import {
  TelegramMessageMeta,
  TelegramMessageMetaType,
  TelegramMessageModel,
} from "../helpers";
import { TextModel } from "../../src/text";
import { LanguageCode } from "../../src/recognition/types";
import { LabelId } from "../../src/text/labels";
import { BotButtonData } from "../../src/telegram/types";
import { botCommands } from "../../src/telegram/data";

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

export function mockTgSetCommands(host: nock.Scope) {
  host.post("/bottelegram-api-token/setMyCommands").reply((uri, body) => {
    const answer = typeof body === "string" ? parse(body) : body;
    expect(answer.commands).toBeDefined();
    const commands = JSON.parse(answer.commands);
    expect(commands.length).toBe(botCommands.length);

    botCommands.forEach((botCommand, ind) => {
      expect(commands[ind].command).toBe(botCommand.command);
      expect(commands[ind].description).toBe(botCommand.description);
    });
    return [200, telegramApiResponseOk];
  });
}

export function mockTgSetWebHook(host: nock.Scope, hookUrl: string): void {
  host
    .post(`/bottelegram-api-token/setWebHook?url=${hookUrl}`)
    .reply(200, telegramApiResponseOk);
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

export function mockTgReceiveRawMessage(
  host: nock.Scope,
  chatId: number,
  lang: LanguageCode,
  message: string
): Promise<void> {
  return new Promise((resolve) => {
    host.post("/bottelegram-api-token/sendMessage").reply(200, (uri, body) => {
      const answer = typeof body === "string" ? parse(body) : body;
      expect(answer.chat_id).toBe(String(chatId));
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
  meta?: TelegramMessageMeta
): Promise<string> {
  return new Promise<string>((resolve) => {
    host.post("/bottelegram-api-token/sendMessage").reply(200, (uri, body) => {
      const answer = typeof body === "string" ? parse(body) : body;
      expect(answer.chat_id).toBe(String(chatId));
      expect(answer.text).toBe(text.t(textId, lang));
      let prefixId = "";
      if (meta) {
        expect(answer.reply_markup).toBeDefined();
        let metaItems = JSON.parse(answer.reply_markup).inline_keyboard;
        expect(metaItems).toBeDefined();

        if (meta.type === TelegramMessageMetaType.Link) {
          expect(metaItems).toHaveLength(1);
          metaItems = metaItems.shift();
          expect(metaItems).toHaveLength(meta.items.length);

          metaItems.forEach((metaItem, ind) => {
            const itemInfo = metaItem;
            const metaItemInfo = meta.items[ind];
            expect(itemInfo).toBeDefined();
            expect(itemInfo.text).toBe(text.t(metaItemInfo.title, lang));
            expect(itemInfo.url).toBe(metaItemInfo.data);
          });
        }

        if (meta.type === TelegramMessageMetaType.Button) {
          expect(metaItems).toHaveLength(meta.items.length);
          metaItems.forEach((metaItem, ind) => {
            const itemInfo = metaItem.shift();
            const metaItemInfo = meta.items[ind];

            expect(itemInfo).toBeDefined();
            expect(itemInfo.text).toBe(text.t(metaItemInfo.title, lang));
            const callbackData: BotButtonData = JSON.parse(
              itemInfo.callback_data
            );
            expect(callbackData.l).toBe(metaItemInfo.data);
            expect(callbackData.i).toBeDefined();
            prefixId = callbackData.i;
          });
        }
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
  ).then(() => {
    // Flatten promise
  });
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
  textId: LabelId
): Promise<void> {
  return new Promise((resolve) => {
    host
      .post("/bottelegram-api-token/editMessageText")
      .reply(200, (uri, body) => {
        const answer = typeof body === "string" ? parse(body) : body;
        expect(answer.chat_id).toBe(String(chatId));
        expect(answer.text).toBe(text.t(textId, langId));
        expect(answer.message_id).toBe(String(messageId));
        resolve();
        return telegramApiResponseOk;
      });
  });
}
