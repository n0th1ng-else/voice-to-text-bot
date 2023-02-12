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
import nock from "nock";
import request from "supertest";
import { Pool as MockPool } from "../src/db/__mocks__/pg.js";
import { injectDependencies } from "../src/testUtils/dependencies.js";
import { injectTestDependencies } from "./helpers/dependencies.js";

jest.unstable_mockModule(
  "../src/logger/index",
  () => import("../src/logger/__mocks__/index.js")
);
jest.unstable_mockModule("../src/env", () => import("../src/__mocks__/env.js"));
jest.unstable_mockModule(
  "../src/analytics/amplitude/index",
  () => import("../src/analytics/amplitude/__mocks__/index.js")
);

const appPort = 3900;
const dbPort = appPort + 1;
const enableSSL = false;

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: dbPort,
};

const paymentToken = "stripe-token";
const testPool = new MockPool(dbConfig);

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));
let chatType;
let testMessageId = 0;
let testChatId = 0;

let tgMessage;
let testLang;
let host;
let bot;
let randomIntFromInterval;
let telegramServer;
let LanguageCode;
let TelegramMessageModel;
let BotCommand;
let mockGetBotStatItem;
let sendTelegramMessage;
let mockTgReceiveMessage;
let LabelId;
let getFundButtons;
let sendTelegramCallbackMessage;
let mockTgReceiveInvoiceMessage;
let mockCreateDonationRow;
let BotStatRecordModel;

describe("[default language - english] fund", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    const initTest = await injectTestDependencies();

    randomIntFromInterval = init.randomIntFromInterval;
    LanguageCode = init.LanguageCode;
    TelegramMessageModel = initTest.TelegramMessageModel;
    BotCommand = init.BotCommand;
    mockGetBotStatItem = initTest.mockGetBotStatItem;
    sendTelegramMessage = initTest.sendTelegramMessage;
    mockTgReceiveMessage = initTest.mockTgReceiveMessage;
    LabelId = init.LabelId;
    getFundButtons = initTest.getFundButtons;
    sendTelegramCallbackMessage = initTest.sendTelegramCallbackMessage;
    mockTgReceiveInvoiceMessage = initTest.mockTgReceiveInvoiceMessage;
    mockCreateDonationRow = initTest.mockCreateDonationRow;
    BotStatRecordModel = initTest.BotStatRecordModel;

    const mockGoogleAuth = initTest.mockGoogleAuth;
    const getMockCertificate = initTest.getMockCertificate;
    const getVoiceConverterInstance = init.getVoiceConverterInstance;
    const getVoiceConverterProvider = init.getVoiceConverterProvider;
    const DbClient = init.DbClient;
    const localhostUrl = init.localhostUrl;
    const TelegramBotModel = init.TelegramBotModel;
    const TelegramApi = init.TelegramApi;
    const StripePayment = init.StripePayment;
    const mockTgGetWebHook = initTest.mockTgGetWebHook;
    const ExpressServer = init.ExpressServer;
    const appVersion = init.appVersion;
    const httpsOptions = init.httpsOptions;
    const NodesSql = init.NodesSql;
    const UsagesSql = init.UsagesSql;
    const DonationsSql = init.DonationsSql;
    const UsedEmailsSql = init.UsedEmailsSql;

    mockGoogleAuth();

    const converterOptions = {
      isTestEnv: true,
      googlePrivateKey: getMockCertificate(),
      googleProjectId: "some-project",
      googleClientEmail: "some-email",
    };
    const converter = getVoiceConverterInstance(
      getVoiceConverterProvider("GOOGLE"),
      converterOptions
    );
    const db = new DbClient(dbConfig, 0, testPool);
    const hostUrl = `${localhostUrl}:${appPort}`;
    bot = new TelegramBotModel("telegram-api-token", converter, db);
    bot.setHostLocation(hostUrl);
    telegramServer = nock(TelegramApi.url);
    host = request(hostUrl);

    chatType = "private";
    testLang = LanguageCode.En;
    tgMessage = new TelegramMessageModel(testChatId, chatType);
    const paymentProvider = new StripePayment(paymentToken);
    bot.setPayment(paymentProvider);

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
    chatType = "private";
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
        const donationId = 43646456;
        const price = 7;

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
            getFundButtons()
          ),
        ]).then(([, prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setFundCallback(tgMessage.messageId + 1, price, prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLang, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLang,
              paymentToken,
              donationId,
              price
            ),
            mockCreateDonationRow(testPool, statModel, 7, donationId),
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
        const donationId = 214566;
        const price = 3;

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
            getFundButtons()
          ),
        ]).then(([, prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setFundCallback(tgMessage.messageId + 1, price, prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLang, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLang,
              paymentToken,
              donationId,
              price
            ),
            mockCreateDonationRow(testPool, statModel, 3, donationId),
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
        const donationId = 5780;
        const price = 5;
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
            getFundButtons()
          ),
        ]).then(([, prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setFundCallback(tgMessage.messageId + 1, price, prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLang, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLang,
              paymentToken,
              donationId,
              price
            ),
            mockCreateDonationRow(testPool, statModel, 5, donationId),
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
        const donationId = 911;
        const price = 7;

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
            getFundButtons()
          ),
        ]).then(([, prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setFundCallback(tgMessage.messageId + 1, price, prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLang, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLang,
              paymentToken,
              donationId,
              price
            ),
            mockCreateDonationRow(testPool, statModel, 7, donationId),
          ]);
        });
      });
    });
  });
});
