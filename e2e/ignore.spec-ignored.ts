import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import nock from "nock";
import { mockTableCreation, Pool as MockPool } from "../src/db/__mocks__/pg.js";
import type { TgChatType } from "../src/telegram/api/groups/chats/chats-types.js";
import type { VoidPromise } from "../src/common/types.js";
import { asChatId__test, asMessageId__test, asFileId__test } from "../src/testUtils/types.js";
import { TelegramBotModel } from "../src/telegram/bot.js";
import { getVoiceConverterInstances } from "../src/recognition/index.js";
import { localhostUrl } from "../src/const.js";
import { DbClient } from "../src/db/client.js";
import { getDb } from "../src/db/index.js";
import { appVersion, launchTime } from "../src/env.js";
import { TelegramBaseApi } from "../src/telegram/api/groups/core.js";
import { BotServer } from "../src/server/bot-server.js";
import { randomIntFromInterval } from "../src/common/timer.js";
import { BotCommand } from "../src/telegram/commands.js";
import { mockGoogleAuth } from "./requests/google.js";
import { getConverterOptions, TelegramMessageModel } from "./helpers.js";
import { mockTgGetWebHook, sendTelegramMessage } from "./requests/telegram.js";
import { mockGetIgnoredChatsRow } from "./requests/db/ignoredChatsDb.js";
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

const appPort = 3100;
const dbPort = appPort + 1;
const webhookDoNotWait = false;

let stopHandler: VoidPromise = () => Promise.reject(new Error("Server did not start"));

let testMessageId = asMessageId__test(0);
let testChatId = asChatId__test(0);

let bot: TelegramBotModel;
let telegramServer: nock.Scope;
let testPool: MockPool;
let host: request.Agent;

describe("ignore chats", () => {
  beforeAll(async () => {
    mockGoogleAuth();

    await prepareSentryInstance();
    const converters = await getVoiceConverterInstances("GOOGLE", "GOOGLE", getConverterOptions());
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

    await db.init();
    stopHandler = await server.setSelfUrl(hostUrl).setBots([bot]).setStat(db).start();
    await server.applyHostLocation();
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
    // expect(trackNotMatchedRoutesHandler()).toBe(true); // TODO fix
  });

  const chatTypes: readonly TgChatType[] = ["private", "group", "supergroup", "channel"] as const;

  chatTypes.forEach((type) => {
    it(`does not respond on a message without voice content in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setText(testMessageId, "some text");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a /start message in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setText(testMessageId, BotCommand.Start);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a /support message in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setText(testMessageId, BotCommand.Support);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a /lang message in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setText(testMessageId, BotCommand.Language);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a /donate message in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setText(testMessageId, BotCommand.Donate);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does nothing if the message is from another bot in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      tgMessage.setName(testMessageId, {}, true);

      return sendTelegramMessage(host, bot, tgMessage);
    });

    it(`does not convert voice into text (it fits 90 sec limit) in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;

      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not answer to convert big voice files more than 90 sec in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 90;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on a voice message with wrong mime type in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 20;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration, "broken/type");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not convert audio into text (it fits 90 sec limit) in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not answer for denies to convert big audio files more than 90 sec in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 90;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });

    it(`does not respond on an audio message with wrong mime type in ${type} chat`, () => {
      const tgMessage = new TelegramMessageModel(testChatId, type);
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 20;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration, "broken/test");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, true),
      ]);
    });
  });
});
