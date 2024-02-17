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
import request from "supertest";
import nock from "nock";
import {
  injectDependencies,
  InjectedFn,
} from "../src/testUtils/dependencies.js";
import {
  InjectedTestFn,
  injectTestDependencies,
} from "./helpers/dependencies.js";
import { mockTableCreation, Pool as MockPool } from "../src/db/__mocks__/pg.js";
import type { TgChatType } from "../src/telegram/api/types.js";
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

const appPort = 3100;
const dbPort = appPort + 1;
const webhookDoNotWait = false;

let stopHandler: VoidPromise = () =>
  Promise.reject(new Error("Server did not start"));

let testMessageId = 0;
let testChatId = 0;

let tgMessage: InstanceType<InjectedTestFn["TelegramMessageModel"]>;
let bot: InstanceType<InjectedFn["TelegramBotModel"]>;
let telegramServer: nock.Scope;
let TelegramMessageModel: InjectedTestFn["TelegramMessageModel"];
let testPool: MockPool;
let randomIntFromInterval: InjectedFn["randomIntFromInterval"];
let host: request.Agent;
let sendTelegramMessage: InjectedTestFn["sendTelegramMessage"];
let BotCommand: InjectedFn["BotCommand"];
let mockGetIgnoredChatsRow: InjectedTestFn["mockGetIgnoredChatsRow"];
let trackNotMatchedRoutes: ReturnType<InjectedTestFn["trackNotMatchedRoutes"]>;

describe("ignore chats", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    const initTest = await injectTestDependencies();
    randomIntFromInterval = init.randomIntFromInterval;
    TelegramMessageModel = initTest.TelegramMessageModel;
    BotCommand = init.BotCommand;
    sendTelegramMessage = initTest.sendTelegramMessage;
    randomIntFromInterval = init.randomIntFromInterval;
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
    const mockTgGetWebHook = initTest.mockTgGetWebHook;
    const BotServer = init.BotServer;
    const appVersion = init.appVersion;
    const launchTime = init.launchTime;

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

    const hostUrl = `${localhostUrl}:${appPort}`;

    const dbConfig = {
      user: "spy-user",
      password: "not-me",
      host: "localhost",
      database: "test-db",
      port: dbPort,
    };
    testPool = new MockPool(dbConfig);
    mockTableCreation(testPool);
    const mainDb = new DbClient(dbConfig, 0, testPool);
    const db = getDb([dbConfig], 0, mainDb);

    bot = new TelegramBotModel("telegram-api-token", converter, db);
    bot.setHostLocation(hostUrl, launchTime);

    telegramServer = nock(TelegramApi.url);
    host = request(hostUrl);

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
    testMessageId = randomIntFromInterval(1, 100000);
    testChatId = randomIntFromInterval(1, 100000);
  });

  afterEach(() => {
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
    expect(trackNotMatchedRoutes()).toBe(true);
  });

  const chatTypes: Readonly<TgChatType[]> = [
    "private",
    "group",
    "supergroup",
    "channel",
  ] as const;

  chatTypes.forEach((type) => {
    it(`does not respond on a message without voice content in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setText(testMessageId, "some text");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a /start message in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setText(testMessageId, BotCommand.Start);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a /support message in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setText(testMessageId, BotCommand.Support);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a /lang message in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setText(testMessageId, BotCommand.Language);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a /donate message in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setText(testMessageId, BotCommand.Donate);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does nothing if the message is from another bot in ${type} chat`, () => {
      tgMessage.setName(testMessageId, {}, true);

      return Promise.all([sendTelegramMessage(host, bot, tgMessage)]);
    });

    it(`does not convert voice into text (it fits 90 sec limit) in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 89;

      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not answer to convert big voice files more than 90 sec in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 90;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a voice message with wrong mime type in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 20;
      tgMessage.setVoice(
        testMessageId,
        voiceFileId,
        voiceFileDuration,
        "broken/type",
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not convert audio into text (it fits 90 sec limit) in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 89;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not answer for denies to convert big audio files more than 90 sec in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 90;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on an audio message with wrong mime type in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 20;
      tgMessage.setAudio(
        testMessageId,
        voiceFileId,
        voiceFileDuration,
        "broken/test",
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });
  });
});
