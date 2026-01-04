import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import nock from "nock";
import { mockTableCreation, Pool as MockPool } from "../src/db/__mocks__/pg.js";
import type { TgChatType } from "../src/telegram/api/groups/chats/chats-types.js";
import type { LanguageCode } from "../src/recognition/types.js";
import type { VoidPromise } from "../src/common/types.js";
import type { Currency } from "../src/telegram/api/groups/payments/payments-types.js";
import { asChatId__test, asDonationId__test, asMessageId__test } from "../src/testUtils/types.js";
import { TelegramBotModel } from "../src/telegram/bot.js";
import { getVoiceConverterInstances } from "../src/recognition/index.js";
import { DbClient } from "../src/db/client.js";
import { getDb } from "../src/db/index.js";
import { localhostUrl } from "../src/const.js";
import { TelegramBaseApi } from "../src/telegram/api/groups/core.js";
import { StripePayment } from "../src/donate/stripe.js";
import { BotServer } from "../src/server/bot-server.js";
import { appVersion } from "../src/env.js";
import { randomIntFromInterval } from "../src/common/timer.js";
import { BotCommand } from "../src/telegram/commands.js";
import { TranslationKeys } from "../src/text/types.js";
import { trackNotMatchedRoutes } from "./requests/common.js";
import { mockGoogleAuth } from "./requests/google.js";
import {
  BotStatRecordModel,
  getConverterOptions,
  getDonateButtons,
  TelegramMessageModel,
} from "./helpers.js";
import {
  mockTgGetWebHook,
  mockTgReceiveInvoiceMessage,
  mockTgReceiveMessage,
  sendTelegramCallbackMessage,
  sendTelegramMessage,
} from "./requests/telegram.js";
import { mockGetBotStatItem } from "./requests/db/botStat.js";
import { mockGetIgnoredChatsRow } from "./requests/db/ignoredChatsDb.js";
import { mockCreateDonationRow } from "./requests/db/donationStat.js";
import { prepareSentryInstance } from "../src/monitoring/sentry/index.js";

vi.mock("../src/logger/index");
vi.mock("../src/env");
vi.mock("../src/analytics/amplitude/index");
vi.mock("../src/analytics/ga/index");
vi.mock("../src/telegram/api/tgMTProtoApi");
vi.mock("../src/monitoring/sentry/sentry-node", async () => {
  const mod = await import("../src/monitoring/sentry/sentry-dummy.js");
  return {
    SentryNodeClient: mod.SentryDummyClient,
  };
});

const appPort = 3900;
const dbPort = appPort + 1;
const webhookDoNotWait = false;
const trackNotMatchedRoutesHandler = trackNotMatchedRoutes();

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: dbPort,
};

const paymentToken = "stripe-token";
const testPool = new MockPool(dbConfig);
mockTableCreation(testPool);

let stopHandler: VoidPromise = () => Promise.reject(new Error("Server did not start"));

let chatType: TgChatType;
let testMessageId = asMessageId__test(0);
let testChatId = asChatId__test(0);

let tgMessage: TelegramMessageModel;
let testLangId: LanguageCode;
let bot: TelegramBotModel;
let telegramServer: nock.Scope;
let host: request.Agent;

describe("[default language - english] donate", () => {
  beforeAll(async () => {
    mockGoogleAuth();

    await prepareSentryInstance();
    const converters = await getVoiceConverterInstances("GOOGLE", "GOOGLE", getConverterOptions());
    const mainDb = new DbClient(dbConfig, 0, testPool);
    const db = getDb([dbConfig], 0, mainDb);

    const hostUrl = `${localhostUrl}:${appPort}`;
    bot = await TelegramBotModel.factory(
      "telegram-api-token",
      92345555,
      "telegram-app-hash",
      true,
      converters,
      db,
    );
    bot.setHostLocation(hostUrl);
    telegramServer = nock(TelegramBaseApi.url);
    host = request(hostUrl);

    chatType = "private";
    testLangId = "en-US";
    tgMessage = new TelegramMessageModel(testChatId, chatType);
    const paymentProvider = new StripePayment(paymentToken);
    bot.setPayment(paymentProvider);

    mockTgGetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);

    const server = new BotServer(appPort, appVersion, webhookDoNotWait);

    await db.init();
    stopHandler = await server.setSelfUrl(hostUrl).setBots([bot]).setStat(db).start();
    await server.applyHostLocation();
  });

  afterAll(() => stopHandler());

  beforeEach(() => {
    bot.setAuthor("");
    chatType = "private";
    testMessageId = asMessageId__test(randomIntFromInterval(1, 100000));
  });

  afterEach(() => {
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
    expect(trackNotMatchedRoutesHandler()).toBe(true);
  });

  describe("DIRECT", () => {
    beforeEach(() => {
      testChatId = asChatId__test(randomIntFromInterval(1, 100000));
      tgMessage = new TelegramMessageModel(testChatId, chatType);
    });

    describe("ENGLISH", () => {
      beforeEach(() => {
        testLangId = "en-US";
      });

      it("responds on a /donate message with extra buttons and sends payment link", () => {
        tgMessage.setText(testMessageId, BotCommand.Donate);
        const donationId = asDonationId__test(43646456);
        const price = 7;
        const currency: Currency = "EUR";

        const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, testLangId);

        return Promise.all([
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            TranslationKeys.DonateCommandMessage,
            getDonateButtons(),
          ),
          sendTelegramMessage(host, bot, tgMessage),
          mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        ]).then(([prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setDonateCallback(
            asMessageId__test(tgMessage.messageId + 1),
            price,
            currency,
            prefixId,
          );
          mockGetBotStatItem(testPool, tgMessage.chatId, testLangId, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              testLangId,
              paymentToken,
              String(donationId),
              price,
            ),
            mockCreateDonationRow(testPool, statModel, 7, "EUR", donationId),
          ]);
        });
      });
    });

    describe("RUSSIAN", () => {
      beforeEach(() => {
        testLangId = "ru-RU";
      });

      it("responds on a /donate message with extra buttons and sends payment link", () => {
        tgMessage.setText(testMessageId, BotCommand.Donate);
        const botStat = new BotStatRecordModel(tgMessage.chatId, testLangId);
        const donationId = asDonationId__test(214566);
        const price = 3;
        const currency: Currency = "EUR";

        const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

        return Promise.all([
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            TranslationKeys.DonateCommandMessage,
            getDonateButtons(),
          ),
          sendTelegramMessage(host, bot, tgMessage),
          mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        ]).then(([prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setDonateCallback(
            asMessageId__test(tgMessage.messageId + 1),
            price,
            currency,
            prefixId,
          );
          mockGetBotStatItem(testPool, tgMessage.chatId, testLangId, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              testLangId,
              paymentToken,
              String(donationId),
              price,
            ),
            mockCreateDonationRow(testPool, statModel, 3, "EUR", donationId),
          ]);
        });
      });
    });
  });

  describe("GROUP", () => {
    beforeEach(() => {
      testChatId = asChatId__test(0 - randomIntFromInterval(1, 100000));
      tgMessage = new TelegramMessageModel(testChatId, chatType);
    });

    describe("ENGLISH", () => {
      beforeEach(() => {
        testLangId = "en-US";
      });

      it("responds on a /donate message with extra buttons and sends payment link", () => {
        const donationId = asDonationId__test(5780);
        const price = 5;
        const currency: Currency = "EUR";

        tgMessage.setText(testMessageId, BotCommand.Donate);
        const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, testLangId);

        return Promise.all([
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            TranslationKeys.DonateCommandMessage,
            getDonateButtons(),
          ),
          sendTelegramMessage(host, bot, tgMessage),
          mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        ]).then(([prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setDonateCallback(
            asMessageId__test(tgMessage.messageId + 1),
            price,
            currency,
            prefixId,
          );
          mockGetBotStatItem(testPool, tgMessage.chatId, testLangId, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              testLangId,
              paymentToken,
              String(donationId),
              price,
            ),
            mockCreateDonationRow(testPool, statModel, 5, "EUR", donationId),
          ]);
        });
      });
    });

    describe("RUSSIAN", () => {
      beforeEach(() => {
        testLangId = "ru-RU";
      });

      it("responds on a /donate message with extra buttons and sends payment link", () => {
        tgMessage.setText(testMessageId, BotCommand.Donate);
        const botStat = new BotStatRecordModel(tgMessage.chatId, testLangId);
        const donationId = asDonationId__test(911);
        const price = 7;
        const currency: Currency = "EUR";

        const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

        return Promise.all([
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            TranslationKeys.DonateCommandMessage,
            getDonateButtons(),
          ),
          sendTelegramMessage(host, bot, tgMessage),
          mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        ]).then(([prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setDonateCallback(
            asMessageId__test(tgMessage.messageId + 1),
            price,
            currency,
            prefixId,
          );
          mockGetBotStatItem(testPool, tgMessage.chatId, testLangId, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              testLangId,
              paymentToken,
              String(donationId),
              price,
            ),
            mockCreateDonationRow(testPool, statModel, 7, "EUR", donationId),
          ]);
        });
      });
    });
  });
});
