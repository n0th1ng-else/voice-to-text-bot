import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import nock from "nock";
import {
  injectDependencies,
  type InjectedFn,
} from "../src/testUtils/dependencies.js";
import {
  type InjectedTestFn,
  injectTestDependencies,
} from "./helpers/dependencies.js";
import { mockTableCreation, Pool as MockPool } from "../src/db/__mocks__/pg.js";
import type { TgChatType } from "../src/telegram/api/groups/chats/chats-types.js";
import type { LanguageCode } from "../src/recognition/types.js";
import type { VoidPromise } from "../src/common/types.js";
import type { Currency } from "../src/telegram/api/groups/payments/payments-types.js";
import {
  asChatId__test,
  asDonationId__test,
  asMessageId__test,
} from "../src/testUtils/types.js";
import type { TelegramBotModel } from "../src/telegram/bot.js";

vi.mock("../src/logger/index");
vi.mock("../src/env");
vi.mock("../src/analytics/amplitude/index");
vi.mock("../src/analytics/ga/index");
vi.mock("../src/telegram/api/tgMTProtoApi");

const appPort = 3900;
const dbPort = appPort + 1;
const webhookDoNotWait = false;

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
let testMessageId = asMessageId__test(0);
let testChatId = asChatId__test(0);

let tgMessage: InstanceType<InjectedTestFn["TelegramMessageModel"]>;
let testLangId: LanguageCode;
let bot: TelegramBotModel;
let telegramServer: nock.Scope;
let host: request.Agent;
let randomIntFromInterval: InjectedFn["randomIntFromInterval"];
let TelegramMessageModel: InjectedTestFn["TelegramMessageModel"];
let BotCommand: InjectedFn["BotCommand"];
let mockGetBotStatItem: InjectedTestFn["mockGetBotStatItem"];
let sendTelegramMessage: InjectedTestFn["sendTelegramMessage"];
let mockTgReceiveMessage: InjectedTestFn["mockTgReceiveMessage"];
let TranslationKeys: InjectedFn["TranslationKeys"];
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
    TranslationKeys = init.TranslationKeys;
    getDonateButtons = initTest.getDonateButtons;
    sendTelegramCallbackMessage = initTest.sendTelegramCallbackMessage;
    mockTgReceiveInvoiceMessage = initTest.mockTgReceiveInvoiceMessage;
    mockCreateDonationRow = initTest.mockCreateDonationRow;
    BotStatRecordModel = initTest.BotStatRecordModel;
    mockGetIgnoredChatsRow = initTest.mockGetIgnoredChatsRow;

    trackNotMatchedRoutes = initTest.trackNotMatchedRoutes();
    const mockGoogleAuth = initTest.mockGoogleAuth;
    const getVoiceConverterInstances = init.getVoiceConverterInstances;
    const DbClient = init.DbClient;
    const getDb = init.getDb;
    const localhostUrl = init.localhostUrl;
    const TelegramBotModel = init.TelegramBotModel;
    const TelegramBaseApi = init.TelegramBaseApi;
    const StripePayment = init.StripePayment;
    const mockTgGetWebHook = initTest.mockTgGetWebHook;
    const BotServer = init.BotServer;
    const appVersion = init.appVersion;

    mockGoogleAuth();

    const converters = await getVoiceConverterInstances(
      "GOOGLE",
      "GOOGLE",
      initTest.getConverterOptions(),
    );
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
    testMessageId = asMessageId__test(randomIntFromInterval(1, 100000));
  });

  afterEach(() => {
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
    expect(trackNotMatchedRoutes()).toBe(true);
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
