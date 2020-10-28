import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { mockGoogleAuth } from "./requests/google";
import {
  LanguageCode,
  VoiceConverterOptions,
  VoiceConverterProvider,
} from "../src/recognition/types";
import {
  BotStatRecordModel,
  getFundButtons,
  getMockCertificate,
  TelegramMessageMetaItem,
  TelegramMessageMetaType,
  TelegramMessageModel,
} from "./helpers";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../src/recognition";
import { localhostUrl } from "../src/const";
import { Pool as MockPool } from "../src/db/__mocks__/pg";
import { DbClient } from "../src/db";
import { TelegramBotModel } from "../src/telegram/bot";
import { appVersion } from "../src/env";
import nock from "nock";
import { TelegramApi } from "../src/telegram/api";
import request from "supertest";
import { TgChatType } from "../src/telegram/api/types";
import { RobokassaPayment } from "../src/donate/robokassa";
import {
  mockTgGetWebHook,
  mockTgReceiveCallbackMessage,
  mockTgReceiveMessage,
  sendTelegramCallbackMessage,
  sendTelegramMessage,
} from "./requests/telegram";
import { ExpressServer } from "../src/server/express";
import { httpsOptions } from "../certs";
import { NodesSql } from "../src/db/sql/nodes.sql";
import { UsagesSql } from "../src/db/sql/usages.sql";
import { DonationsSql } from "../src/db/sql/donations.sql";
import { UsedEmailsSql } from "../src/db/sql/emails.sql";
import { randomIntFromInterval } from "../src/common/timer";
import { BotCommand } from "../src/telegram/types";
import { mockGetBotStatItem } from "./requests/db/botStat";
import { LabelId } from "../src/text/labels";
import { mockCreateDonationRow } from "./requests/db/donetaionStat";

jest.mock("../src/logger");
jest.mock("../src/env");

mockGoogleAuth();

const converterOptions: VoiceConverterOptions = {
  isTestEnv: true,
  googlePrivateKey: getMockCertificate(),
  googleProjectId: "some-project",
  googleClientEmail: "some-email",
};

const converter = getVoiceConverterInstance(
  getVoiceConverterProvider(VoiceConverterProvider.Google),
  converterOptions
);

const appPort = 3900;
const dbPort = appPort + 1;

const hostUrl = `${localhostUrl}:${appPort}`;

const enableSSL = false;

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: dbPort,
};
const testPool = new MockPool(dbConfig);
const db = new DbClient(dbConfig, testPool);

const bot = new TelegramBotModel("telegram-api-token", converter, db);
bot.setHostLocation(hostUrl);

const telegramServer = nock(TelegramApi.url);
const host = request(hostUrl);

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

let chatType: TgChatType = TgChatType.Private;
let testMessageId = 0;
let testChatId = 0;
let tgMessage: TelegramMessageModel = new TelegramMessageModel(
  testChatId,
  chatType
);

const roboPayment = new RobokassaPayment("robo-login", "robo-pwd", false);

bot.setPayment(roboPayment);

let testLang = LanguageCode.En;

describe("[default language - english] fund", () => {
  beforeAll(() => {
    mockTgGetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);

    const server = new ExpressServer(
      appPort,
      enableSSL,
      appVersion,
      httpsOptions
    );

    testPool.mockQuery(NodesSql.createTable, () => Promise.resolve());
    testPool.mockQuery(UsagesSql.createTable, () => Promise.resolve());
    testPool.mockQuery(DonationsSql.createTable, () => Promise.resolve());
    testPool.mockQuery(UsedEmailsSql.createTable, () => Promise.resolve());

    return db
      .init()
      .then(() => server.setSelfUrl(hostUrl).setBots([bot]).setStat(db).start())
      .then((stopFn) => {
        stopHandler = stopFn;
        return server.applyHostLocation();
      });
  });

  afterAll(() => stopHandler());

  beforeEach(() => {
    bot.setAuthor("");
    chatType = TgChatType.Private;
    testMessageId = randomIntFromInterval(1, 100000);
  });

  afterEach(() => {
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
  });

  describe("DIRECT", () => {
    beforeEach(() => {
      testChatId = randomIntFromInterval(1, 100000);
      tgMessage = new TelegramMessageModel(testChatId, chatType);
    });

    describe("ENGLISH", () => {
      beforeEach(() => {
        testLang = LanguageCode.En;
      });

      it("responds on a /fund message with extra buttons and sends payment link", () => {
        tgMessage.setText(testMessageId, BotCommand.Fund);
        const statModel = mockGetBotStatItem(
          testPool,
          tgMessage.chatId,
          testLang
        );

        return Promise.all([
          sendTelegramMessage(host, bot, tgMessage),
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            LabelId.FundCommandMessage,
            getFundButtons(true)
          ),
        ]).then(([, prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setFundCallback(tgMessage.messageId + 1, "7", prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLang, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveCallbackMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLang,
              LabelId.PaymentLink,
              [
                [
                  new TelegramMessageMetaItem(
                    TelegramMessageMetaType.Link,
                    LabelId.PaymentLinkButton,
                    "https://auth.robokassa.ru/Merchant"
                  ),
                ],
              ]
            ),
            mockCreateDonationRow(testPool, statModel, 7),
          ]);
        });
      });
    });

    describe("RUSSIAN", () => {
      beforeEach(() => {
        testLang = LanguageCode.Ru;
      });

      it("responds on a /fund message with extra buttons and sends payment link", () => {
        tgMessage.setText(testMessageId, BotCommand.Fund);
        const botStat = new BotStatRecordModel(tgMessage.chatId, testLang);

        const statModel = mockGetBotStatItem(
          testPool,
          tgMessage.chatId,
          botStat.langId,
          botStat
        );

        return Promise.all([
          sendTelegramMessage(host, bot, tgMessage),
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            LabelId.FundCommandMessage,
            getFundButtons(true)
          ),
        ]).then(([, prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setFundCallback(tgMessage.messageId + 1, "10", prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLang, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveCallbackMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLang,
              LabelId.PaymentLink,
              [
                [
                  new TelegramMessageMetaItem(
                    TelegramMessageMetaType.Link,
                    LabelId.PaymentLinkButton,
                    "https://auth.robokassa.ru/Merchant"
                  ),
                ],
              ]
            ),
            mockCreateDonationRow(testPool, statModel, 10),
          ]);
        });
      });
    });
  });

  describe("GROUP", () => {
    beforeEach(() => {
      testChatId = 0 - randomIntFromInterval(1, 100000);
      tgMessage = new TelegramMessageModel(testChatId, chatType);
    });

    describe("ENGLISH", () => {
      beforeEach(() => {
        testLang = LanguageCode.En;
      });

      it("responds on a /fund message with extra buttons and sends payment link", () => {
        tgMessage.setText(testMessageId, BotCommand.Fund);
        const statModel = mockGetBotStatItem(
          testPool,
          tgMessage.chatId,
          testLang
        );

        return Promise.all([
          sendTelegramMessage(host, bot, tgMessage),
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            LabelId.FundCommandMessage,
            getFundButtons(true)
          ),
        ]).then(([, prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setFundCallback(tgMessage.messageId + 1, "5", prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLang, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveCallbackMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLang,
              LabelId.PaymentLink,
              [
                [
                  new TelegramMessageMetaItem(
                    TelegramMessageMetaType.Link,
                    LabelId.PaymentLinkButton,
                    "https://auth.robokassa.ru/Merchant"
                  ),
                ],
              ]
            ),
            mockCreateDonationRow(testPool, statModel, 5),
          ]);
        });
      });
    });

    describe("RUSSIAN", () => {
      beforeEach(() => {
        testLang = LanguageCode.Ru;
      });

      it("responds on a /fund message with extra buttons and sends payment link", () => {
        tgMessage.setText(testMessageId, BotCommand.Fund);
        const botStat = new BotStatRecordModel(tgMessage.chatId, testLang);

        const statModel = mockGetBotStatItem(
          testPool,
          tgMessage.chatId,
          botStat.langId,
          botStat
        );

        return Promise.all([
          sendTelegramMessage(host, bot, tgMessage),
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            LabelId.FundCommandMessage,
            getFundButtons(true)
          ),
        ]).then(([, prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setFundCallback(tgMessage.messageId + 1, "7", prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLang, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveCallbackMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLang,
              LabelId.PaymentLink,
              [
                [
                  new TelegramMessageMetaItem(
                    TelegramMessageMetaType.Link,
                    LabelId.PaymentLinkButton,
                    "https://auth.robokassa.ru/Merchant"
                  ),
                ],
              ]
            ),
            mockCreateDonationRow(testPool, statModel, 7),
          ]);
        });
      });
    });
  });
});
