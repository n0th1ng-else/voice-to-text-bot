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
import { mockTableCreation, Pool as MockPool } from "../src/db/__mocks__/pg.js";
import {
  injectDependencies,
  InjectedFn,
} from "../src/testUtils/dependencies.js";
import {
  InjectedTestFn,
  injectTestDependencies,
} from "./helpers/dependencies.js";
import type { TgChatType } from "../src/telegram/api/types.js";
import type { LanguageCode } from "../src/recognition/types.js";
import type { VoidPromise } from "../src/common/types.js";

jest.unstable_mockModule(
  "../src/logger/index",
  () => import("../src/logger/__mocks__/index.js"),
);
jest.unstable_mockModule("../src/env", () => import("../src/__mocks__/env.js"));
jest.unstable_mockModule(
  "../src/analytics/amplitude/index",
  () => import("../src/analytics/amplitude/__mocks__/index.js"),
);
jest.unstable_mockModule(
  "../src/analytics/ga/index",
  () => import("../src/analytics/ga/__mocks__/index.js"),
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
mockTableCreation(testPool);

let stopHandler: VoidPromise = () =>
  Promise.reject(new Error("Server did not start"));

let chatType: TgChatType;
let testMessageId = 0;
let testChatId = 0;

let tgMessage: InstanceType<InjectedTestFn["TelegramMessageModel"]>;
let testLangId: LanguageCode;
let bot: InstanceType<InjectedFn["TelegramBotModel"]>;
let telegramServer: nock.Scope;
let host: request.SuperTest<request.Test>;
let randomIntFromInterval: InjectedFn["randomIntFromInterval"];
let TelegramMessageModel: InjectedTestFn["TelegramMessageModel"];
let BotCommand: InjectedFn["BotCommand"];
let mockGetBotStatItem: InjectedTestFn["mockGetBotStatItem"];
let sendTelegramMessage: InjectedTestFn["sendTelegramMessage"];
let mockTgReceiveMessage: InjectedTestFn["mockTgReceiveMessage"];
let LabelId: InjectedFn["LabelId"];
let getDonateButtons: InjectedTestFn["getDonateButtons"];
let sendTelegramCallbackMessage: InjectedTestFn["sendTelegramCallbackMessage"];
let mockTgReceiveInvoiceMessage: InjectedTestFn["mockTgReceiveInvoiceMessage"];
let mockCreateDonationRow: InjectedTestFn["mockCreateDonationRow"];
let BotStatRecordModel: InjectedTestFn["BotStatRecordModel"];
let mockGetIgnoredChatsRow: InjectedTestFn["mockGetIgnoredChatsRow"];
let trackNotMatchedRoutes: ReturnType<InjectedTestFn["trackNotMatchedRoutes"]>;

describe("[default language - english] donate", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    const initTest = await injectTestDependencies();

    randomIntFromInterval = init.randomIntFromInterval;
    TelegramMessageModel = initTest.TelegramMessageModel;
    BotCommand = init.BotCommand;
    mockGetBotStatItem = initTest.mockGetBotStatItem;
    sendTelegramMessage = initTest.sendTelegramMessage;
    mockTgReceiveMessage = initTest.mockTgReceiveMessage;
    LabelId = init.LabelId;
    getDonateButtons = initTest.getDonateButtons;
    sendTelegramCallbackMessage = initTest.sendTelegramCallbackMessage;
    mockTgReceiveInvoiceMessage = initTest.mockTgReceiveInvoiceMessage;
    mockCreateDonationRow = initTest.mockCreateDonationRow;
    BotStatRecordModel = initTest.BotStatRecordModel;
    mockGetIgnoredChatsRow = initTest.mockGetIgnoredChatsRow;

    trackNotMatchedRoutes = initTest.trackNotMatchedRoutes();
    const mockGoogleAuth = initTest.mockGoogleAuth;
    const getMockCertificate = initTest.getMockCertificate;
    const getVoiceConverterInstance = init.getVoiceConverterInstance;
    const getVoiceConverterProvider = init.getVoiceConverterProvider;
    const DbClient = init.DbClient;
    const getDb = init.getDb;
    const localhostUrl = init.localhostUrl;
    const TelegramBotModel = init.TelegramBotModel;
    const TelegramApi = init.TelegramApi;
    const StripePayment = init.StripePayment;
    const mockTgGetWebHook = initTest.mockTgGetWebHook;
    const ExpressServer = init.ExpressServer;
    const appVersion = init.appVersion;
    const httpsOptions = init.httpsOptions;

    mockGoogleAuth();

    const converterOptions = {
      isTestEnv: true,
      googlePrivateKey: getMockCertificate(),
      googleProjectId: "some-project",
      googleClientEmail: "some-email",
    };
    const converter = getVoiceConverterInstance(
      getVoiceConverterProvider("GOOGLE"),
      converterOptions,
    );
    const mainDb = new DbClient(dbConfig, 0, testPool);
    const db = getDb([dbConfig], 0, mainDb);

    const hostUrl = `${localhostUrl}:${appPort}`;
    bot = new TelegramBotModel("telegram-api-token", converter, db);
    bot.setHostLocation(hostUrl);
    telegramServer = nock(TelegramApi.url);
    host = request(hostUrl);

    chatType = "private";
    testLangId = "en-US";
    tgMessage = new TelegramMessageModel(testChatId, chatType);
    const paymentProvider = new StripePayment(paymentToken);
    bot.setPayment(paymentProvider);

    mockTgGetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);

    const server = new ExpressServer(
      appPort,
      enableSSL,
      appVersion,
      httpsOptions,
    );

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
    expect(trackNotMatchedRoutes()).toBe(true);
  });

  describe("DIRECT", () => {
    beforeEach(() => {
      testChatId = randomIntFromInterval(1, 100000);
      tgMessage = new TelegramMessageModel(testChatId, chatType);
    });

    describe("ENGLISH", () => {
      beforeEach(() => {
        testLangId = "en-US";
      });

      it("responds on a /donate message with extra buttons and sends payment link", () => {
        tgMessage.setText(testMessageId, BotCommand.Donate);
        const donationId = 43646456;
        const price = 7;

        const statModel = mockGetBotStatItem(
          testPool,
          tgMessage.chatId,
          testLangId,
        );

        return Promise.all([
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            LabelId.DonateCommandMessage,
            getDonateButtons(),
          ),
          sendTelegramMessage(host, bot, tgMessage),
          mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        ]).then(([prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setDonateCallback(tgMessage.messageId + 1, price, prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLangId, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLangId,
              paymentToken,
              donationId,
              price,
            ),
            mockCreateDonationRow(testPool, statModel, 7, donationId),
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
        const donationId = 214566;
        const price = 3;

        const statModel = mockGetBotStatItem(
          testPool,
          tgMessage.chatId,
          botStat.langId,
          botStat,
        );

        return Promise.all([
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            LabelId.DonateCommandMessage,
            getDonateButtons(),
          ),
          sendTelegramMessage(host, bot, tgMessage),
          mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        ]).then(([prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setDonateCallback(tgMessage.messageId + 1, price, prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLangId, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLangId,
              paymentToken,
              donationId,
              price,
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
        testLangId = "en-US";
      });

      it("responds on a /donate message with extra buttons and sends payment link", () => {
        const donationId = 5780;
        const price = 5;
        tgMessage.setText(testMessageId, BotCommand.Donate);
        const statModel = mockGetBotStatItem(
          testPool,
          tgMessage.chatId,
          testLangId,
        );

        return Promise.all([
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            LabelId.DonateCommandMessage,
            getDonateButtons(),
          ),
          sendTelegramMessage(host, bot, tgMessage),
          mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        ]).then(([prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setDonateCallback(tgMessage.messageId + 1, price, prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLangId, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLangId,
              paymentToken,
              donationId,
              price,
            ),
            mockCreateDonationRow(testPool, statModel, 5, donationId),
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
        const donationId = 911;
        const price = 7;

        const statModel = mockGetBotStatItem(
          testPool,
          tgMessage.chatId,
          botStat.langId,
          botStat,
        );

        return Promise.all([
          mockTgReceiveMessage(
            telegramServer,
            tgMessage.chatId,
            statModel.langId,
            LabelId.DonateCommandMessage,
            getDonateButtons(),
          ),
          sendTelegramMessage(host, bot, tgMessage),
          mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        ]).then(([prefixId]) => {
          const cbMessage = new TelegramMessageModel(testChatId, chatType);
          cbMessage.setDonateCallback(tgMessage.messageId + 1, price, prefixId);
          mockGetBotStatItem(testPool, tgMessage.chatId, testLangId, statModel);
          return Promise.all([
            sendTelegramCallbackMessage(host, bot, cbMessage),
            mockTgReceiveInvoiceMessage(
              telegramServer,
              tgMessage.chatId,
              cbMessage.messageId,
              testLangId,
              paymentToken,
              donationId,
              price,
            ),
            mockCreateDonationRow(testPool, statModel, 7, donationId),
          ]);
        });
      });
    });
  });
});
