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
import type { VoidPromise } from "../src/common/types.js";
import {
  asChatId__test,
  asMessageId__test,
  asFileId__test,
} from "../src/testUtils/types.js";
import type { TelegramBotModel } from "../src/telegram/bot.js";

vi.mock("../src/logger/index");
vi.mock("../src/env");
vi.mock("../src/analytics/amplitude/index");
vi.mock("../src/analytics/ga/index");
vi.mock("../src/telegram/api/tgMTProtoApi");

const appPort = 3100;
const dbPort = appPort + 1;
const webhookDoNotWait = false;

let stopHandler: VoidPromise = () =>
  Promise.reject(new Error("Server did not start"));

let testMessageId = asMessageId__test(0);
let testChatId = asChatId__test(0);

let tgMessage: InstanceType<InjectedTestFn["TelegramMessageModel"]>;
let bot: TelegramBotModel;
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
    const getVoiceConverterInstances = init.getVoiceConverterInstances;
    const DbClient = init.DbClient;
    const getDb = init.getDb;
    const localhostUrl = init.localhostUrl;
    const TelegramBotModel = init.TelegramBotModel;
    const TelegramBaseApi = init.TelegramBaseApi;
    const mockTgGetWebHook = initTest.mockTgGetWebHook;
    const BotServer = init.BotServer;
    const appVersion = init.appVersion;
    const launchTime = init.launchTime;

    mockGoogleAuth();

    const converters = await getVoiceConverterInstances(
      "GOOGLE",
      "GOOGLE",
      initTest.getConverterOptions(),
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

    bot = await TelegramBotModel.factory(
      "telegram-api-token",
      92345555,
      "telegram-app-hash",
      true,
      converters,
      db,
    );
    bot.setHostLocation(hostUrl, launchTime);

    telegramServer = nock(TelegramBaseApi.url);
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
    testMessageId = asMessageId__test(randomIntFromInterval(1, 100000));
    testChatId = asChatId__test(randomIntFromInterval(1, 100000));
  });

  afterEach(() => {
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
    expect(trackNotMatchedRoutes()).toBe(true);
  });

  const chatTypes: readonly TgChatType[] = [
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
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;

      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not answer to convert big voice files more than 90 sec in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 90;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a voice message with wrong mime type in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = asFileId__test("some-file-id");
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
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not answer for denies to convert big audio files more than 90 sec in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 90;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on an audio message with wrong mime type in ${type} chat`, () => {
      tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = asFileId__test("some-file-id");
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
