import { resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import { type Agent as RequestAgent } from "supertest";
import { type Scope as NockScope } from "nock";
import querystring from "query-string";
import { type TelegramBotModel } from "../../src/telegram/bot.js";
import {
  type TelegramMessageMetaItem,
  TelegramMessageMetaType,
  type TelegramMessageModel,
} from "../helpers.js";
import { getTranslator, isTranslationKey } from "../../src/text/index.js";
import {
  type TranslationKey,
  type TranslationKeyFull,
  TranslationKeys,
} from "../../src/text/types.js";
import { getBotMenuCommands } from "../../src/telegram/data.js";
import { TelegramButtonModel } from "../../src/telegram/types.js";
import { parsePaymentPayload } from "../../src/telegram/helpers.js";
import type { TgMessage, TgUpdate } from "../../src/telegram/api/types.js";
import type { LanguageCode } from "../../src/recognition/types.js";
import type { ChatId } from "../../src/telegram/api/core.js";
import { asChatId__test, asMessageId__test, asUpdateId__test } from "../../src/testUtils/types.js";

const text = getTranslator();

const makeTelegramResponse = <D>(result?: D, ok = true) => JSON.stringify({ ok, result });

const makeSampleTelegramMessageResponse = (chatId: unknown, messageId?: unknown): TgMessage => {
  const msgId = messageId ?? 124235;
  return {
    message_id: asMessageId__test(msgId as number),
    date: Date.now(),
    chat: {
      id: asChatId__test(chatId as number),
      type: "private",
    },
  };
};

export const sendTelegramMessage = (
  host: RequestAgent,
  bot: TelegramBotModel,
  msg: TelegramMessageModel,
): Promise<void> => {
  const payload: TgUpdate = {
    update_id: asUpdateId__test(12434),
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
  host: RequestAgent,
  bot: TelegramBotModel,
  msg: TelegramMessageModel,
): Promise<void> => {
  const payload: TgUpdate = {
    update_id: asUpdateId__test(12434),
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

export const mockTgSetCommands = (host: NockScope): void => {
  host.post("/bottelegram-api-token/setMyCommands").reply(200, (uri, body) => {
    const answer = typeof body === "string" ? querystring.parse(body) : body;
    expect(answer.commands).toBeDefined();
    const commands = answer.commands;

    const menuCommands = getBotMenuCommands();
    expect(commands).toHaveLength(menuCommands.length);

    menuCommands.forEach((botCommand, ind) => {
      expect(commands[ind].command).toBe(botCommand.command);
      expect(commands[ind].description).toBe(botCommand.description);
    });
    return makeTelegramResponse(true);
  });
};

export const mockTgSetWebHook = (host: NockScope, hookUrl: string): void => {
  host.post("/bottelegram-api-token/setWebHook").reply(200, (uri, body) => {
    const answer = typeof body === "string" ? querystring.parse(body) : body;
    expect(answer.url).toBe(hookUrl);
    return makeTelegramResponse(true);
  });
};

export const mockTgGetWebHook = (host: NockScope, hookUrl: string): void => {
  host.post("/bottelegram-api-token/getWebhookInfo").reply(200, () => {
    return makeTelegramResponse({ url: hookUrl });
  });
};

export const mockTgGetWebHookError = (host: NockScope): void => {
  host.post("/bottelegram-api-token/getWebhookInfo").reply(503, {
    status: 503,
    message: "Telegram webhook is off",
  });
};

export const mockTgReceiveUnexpectedMessage = (
  host: NockScope,
  reject: (reason: unknown) => void,
): void => {
  host
    .post("/bottelegram-api-token/sendMessage")
    .reply(500, () => reject(new Error("The message is not expected")));
};

export const mockTgReceiveRawMessage = (
  host: NockScope,
  chatId: ChatId,
  lang: LanguageCode,
  message: string,
): Promise<void> => {
  return new Promise((resolve) => {
    host.post("/bottelegram-api-token/sendMessage").reply(200, (uri, body) => {
      const answer = typeof body === "string" ? querystring.parse(body) : body;
      expect(answer.chat_id).toBe(chatId);
      expect(answer.text).toBe(message);
      resolve();
      return makeTelegramResponse<TgMessage>(makeSampleTelegramMessageResponse(answer.chat_id));
    });
  });
};

export const mockTgReceiveMessage = (
  host: NockScope,
  chatId: ChatId,
  lang: LanguageCode,
  textId: TranslationKeyFull,
  expectedMarkup: TelegramMessageMetaItem[][] = [],
): Promise<string> => {
  return new Promise<string>((resolve) => {
    host.post("/bottelegram-api-token/sendMessage").reply(200, (_uri, body) => {
      const answer: Record<
        string,
        {
          inline_keyboard: {
            text: string;
            url: string;
            callback_data: string;
          }[][];
        }
      > = typeof body === "string" ? querystring.parse(body) : body;
      expect(answer.chat_id).toBe(chatId);
      const [textKey, textParams] = Array.isArray(textId) ? textId : [textId];
      expect(answer.text).toBe(text.t(textKey, lang, textParams));
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
              isTranslationKey(expectedItem.title)
                ? text.t(expectedItem.title, lang)
                : expectedItem.title,
            );

            if (expectedItem.type === TelegramMessageMetaType.Button) {
              const btnData = TelegramButtonModel.fromDto(receivedItem.callback_data);

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
      return makeTelegramResponse<TgMessage>(makeSampleTelegramMessageResponse(answer.chat_id));
    });
  });
};

export const mockTgReceiveMessages = async (
  host: NockScope,
  chatId: ChatId,
  lang: LanguageCode,
  textIds: TranslationKeyFull[],
): Promise<void> => {
  await Promise.all(textIds.map((textId) => mockTgReceiveMessage(host, chatId, lang, textId)));
};

export const mockTgGetFileUrl = (host: NockScope, fileId: string): void => {
  const pathToFile = `super/path/to/file/${fileId}`;
  const fullPathToFile = `/file/bottelegram-api-token/${pathToFile}`;

  host.post("/bottelegram-api-token/getFile").reply(200, (uri, body) => {
    const answer = typeof body === "string" ? querystring.parse(body) : body;
    expect(answer.file_id).toBe(fileId);
    return JSON.stringify({
      ok: true,
      result: { file_path: pathToFile },
    });
  });

  const currentDir = fileURLToPath(new URL(".", import.meta.url));
  host
    .get(fullPathToFile)
    .replyWithFile(200, resolvePath(currentDir, "..", "mockData", "sample_file.oga"), {
      "Content-Type": "audio/ogg",
    });
};

export const mockTgReceiveCallbackMessage = (
  host: NockScope,
  chatId: ChatId,
  messageId: number,
  langId: LanguageCode,
  textId: TranslationKey,
  expectedMarkup: TelegramMessageMetaItem[][] = [],
): Promise<void> => {
  return new Promise((resolve) => {
    host.post("/bottelegram-api-token/editMessageText").reply(200, (uri, body) => {
      const answer: Record<
        string,
        {
          inline_keyboard: {
            text: string;
            url: string;
            callback_data: string;
          }[][];
        }
      > = typeof body === "string" ? querystring.parse(body) : body;
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
              isTranslationKey(expectedItem.title)
                ? text.t(expectedItem.title, langId)
                : expectedItem.title,
            );

            if (expectedItem.type === TelegramMessageMetaType.Button) {
              const btnData = TelegramButtonModel.fromDto(receivedItem.callback_data);

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
      return makeTelegramResponse<TgMessage>(
        makeSampleTelegramMessageResponse(answer.chat_id, answer.message_id),
      );
    });
  });
};

export const mockTgReceiveInvoiceMessage = (
  host: NockScope,
  chatId: ChatId,
  langId: LanguageCode,
  paymentToken: string,
  paymentInternalId: string,
  price: number,
): Promise<void> => {
  return new Promise((resolve) => {
    host.post("/bottelegram-api-token/sendInvoice").reply(200, (uri, body) => {
      const answer = typeof body === "string" ? querystring.parse(body) : body;

      expect(answer.chat_id).toBe(chatId);
      expect(answer.currency).toBe("EUR");
      expect(answer.provider_token).toBe(paymentToken);
      expect(answer.start_parameter).toBe(paymentInternalId);
      const payload = parsePaymentPayload(answer.payload);
      expect(payload.chatId).toBe(chatId);
      expect(payload.paymentInternalId).toBe(paymentInternalId);
      expect(payload.prefix).toBeDefined();

      expect(answer.title).toBe(text.t(TranslationKeys.DonationTitle, langId));
      expect(answer.description).toBe(text.t(TranslationKeys.DonationDescription, langId));
      expect(answer.prices).toHaveLength(1);
      expect(answer.prices[0].amount).toBe(price * 100);
      expect(answer.prices[0].label).toBe(text.t(TranslationKeys.DonationLabel, langId));

      resolve();
      return makeTelegramResponse();
    });
  });
};
