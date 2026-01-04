import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import nock from "nock";
import { mockTableCreation, Pool as MockPool } from "../src/db/__mocks__/pg.js";
import { setCurrentMockFileId } from "../src/telegram/api/__mocks__/tgMTProtoApi.js";
import { getSupportedAudioFormats } from "../src/text/utils.js";
import type { TgChatType } from "../src/telegram/api/groups/chats/chats-types.js";
import type { LanguageCode } from "../src/recognition/types.js";
import type { VoidPromise } from "../src/common/types.js";
import { asChatId__test, asMessageId__test, asFileId__test } from "../src/testUtils/types.js";
import { TelegramBotModel } from "../src/telegram/bot.js";
import { getVoiceConverterInstances } from "../src/recognition/index.js";
import { githubUrl, localhostUrl, officialChannelAccount } from "../src/const.js";
import { DbClient } from "../src/db/client.js";
import { getDb } from "../src/db/index.js";
import { appVersion, launchTime } from "../src/env.js";
import { TelegramBaseApi } from "../src/telegram/api/groups/core.js";
import { BotServer } from "../src/server/bot-server.js";
import { randomIntFromInterval } from "../src/common/timer.js";
import { TranslationKeys } from "../src/text/types.js";
import { BotCommand } from "../src/telegram/commands.js";
import { trackNotMatchedRoutes } from "./requests/common.js";
import { mockGoogleAuth, mockSpeechRecognition } from "./requests/google.js";
import {
  getConverterOptions,
  getDonateButtons,
  getLangButtons,
  TelegramMessageMetaItem,
  TelegramMessageMetaType,
  TelegramMessageModel,
} from "./helpers.js";
import {
  mockTgGetWebHook,
  mockTgReceiveCallbackMessage,
  mockTgReceiveMessage,
  mockTgReceiveMessages,
  mockTgReceiveRawMessage,
  sendTelegramCallbackMessage,
  sendTelegramMessage,
} from "./requests/telegram.js";
import {
  mockGetBotStatItem,
  mockUpdateBotStatLang,
  mockUpdateBotStatUsage,
} from "./requests/db/botStat.js";
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
const trackNotMatchedRoutesHandler = trackNotMatchedRoutes();

let stopHandler: VoidPromise = () => Promise.reject(new Error("Server did not start"));

let chatType: TgChatType;
let testMessageId = asMessageId__test(0);
let testChatId = asChatId__test(0);
let tgMessage: TelegramMessageModel;
let bot: TelegramBotModel;
let telegramServer: nock.Scope;
let testPool: MockPool;
let host: request.Agent;

describe("[default language - english]", () => {
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

    chatType = "private";
    tgMessage = new TelegramMessageModel(testChatId, chatType);

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
    testChatId = asChatId__test(randomIntFromInterval(1, 100000));
  });

  afterEach(() => {
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
    expect(trackNotMatchedRoutesHandler()).toBe(true);
  });

  describe("private messages", () => {
    beforeEach(() => {
      tgMessage = new TelegramMessageModel(testChatId, chatType);
    });

    it("responds on a message without voice content", () => {
      tgMessage.setText(testMessageId, "some text");
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.NoContent,
        ),
      ]);
    });

    it("detects user language from the message (RU)", () => {
      tgMessage.setText(testMessageId, "some text");
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "ru-RU");
      tgMessage.setName(asMessageId__test(123323), {}, false, "ru");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.NoContent,
        ),
      ]);
    });

    it("Falls back to EN for non-RU languages", () => {
      tgMessage.setText(testMessageId, "some text");
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");
      tgMessage.setName(asMessageId__test(123323), {}, false, "es");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.NoContent,
        ),
      ]);
    });

    it("responds on a /start message", () => {
      tgMessage.setText(testMessageId, BotCommand.Start);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessages(telegramServer, tgMessage.chatId, statModel.langId, [
          TranslationKeys.WelcomeMessage,
          TranslationKeys.WelcomeMessageGroup,
          TranslationKeys.WelcomeMessageMore,
          TranslationKeys.DonateMessage,
        ]),
      ]);
    });

    it("responds on a /support message", () => {
      tgMessage.setText(testMessageId, BotCommand.Support);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.SupportCommand,
          [
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                TranslationKeys.OfficialChannel,
                officialChannelAccount,
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                TranslationKeys.GithubIssues,
                githubUrl,
              ),
            ],
          ],
        ),
      ]);
    });

    it("responds on a /support message with author url", () => {
      const authorUrl = "some-author-url";
      bot.setAuthor(authorUrl);
      tgMessage.setText(testMessageId, BotCommand.Support);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.SupportCommand,
          [
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                TranslationKeys.OfficialChannel,
                officialChannelAccount,
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                TranslationKeys.ContactAuthor,
                authorUrl,
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                TranslationKeys.GithubIssues,
                githubUrl,
              ),
            ],
          ],
        ),
      ]);
    });

    it("responds on a /lang message", () => {
      tgMessage.setText(testMessageId, BotCommand.Language);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.ChangeLangTitle,
          getLangButtons(),
        ),
      ]);
    });

    it("changes language using the /lang callback message", () => {
      tgMessage.setText(testMessageId, BotCommand.Language);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.ChangeLangTitle,
          getLangButtons(),
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(([prefixId]) => {
        const cbMessage = new TelegramMessageModel(testChatId, chatType);
        const newLangId: LanguageCode = "ru-RU";
        cbMessage.setLangCallback(asMessageId__test(tgMessage.messageId + 1), newLangId, prefixId);
        return Promise.all([
          sendTelegramCallbackMessage(host, bot, cbMessage),
          mockTgReceiveCallbackMessage(
            telegramServer,
            tgMessage.chatId,
            cbMessage.messageId,
            newLangId,
            TranslationKeys.ChangeLang,
          ),
          mockUpdateBotStatLang(testPool, statModel, newLangId),
        ]);
      });
    });

    it("responds on a /donate message", () => {
      tgMessage.setText(testMessageId, BotCommand.Donate);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.DonateCommandMessage,
          getDonateButtons(),
        ),
      ]);
    });

    it("does nothing if the message is from another bot", () => {
      tgMessage.setName(testMessageId, {}, true);

      return sendTelegramMessage(host, bot, tgMessage);
    });

    it("converts voice into text (it fits 90 sec limit)", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;
      const voiceFileContent = "supergroup";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      const speechScope = mockSpeechRecognition(voiceFileContent);
      setCurrentMockFileId(voiceFileId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.InProgress,
        ),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `🗣 ${voiceFileContent}`,
        ),
        mockUpdateBotStatUsage(testPool, statModel),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("denies to convert big voice files more than 90 sec", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 90;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        mockTgReceiveMessages(telegramServer, tgMessage.chatId, statModel.langId, [
          [
            TranslationKeys.LongVoiceMessage,
            {
              duration: "1 min 30 sec",
            },
          ],
        ]),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on a voice message with wrong mime type", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 20;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration, "broken/type");
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        mockTgReceiveMessages(telegramServer, tgMessage.chatId, statModel.langId, [
          TranslationKeys.AudioNotSupportedMessage,
          [TranslationKeys.SupportedFormatsMessage, { formats: getSupportedAudioFormats() }],
          TranslationKeys.SupportedFormatsMessageExplanation,
        ]),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on a voice message with broken duration", () => {
      const voiceFileId = asFileId__test("some-file-id");
      tgMessage.setVoice(testMessageId, voiceFileId, -1);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.NoContent,
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("converts audio into text (it fits 90 sec limit)", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;
      const voiceFileContent = "supergroup";
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      const speechScope = mockSpeechRecognition(voiceFileContent);
      setCurrentMockFileId(voiceFileId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.InProgress,
        ),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `🗣 ${voiceFileContent}`,
        ),
        mockUpdateBotStatUsage(testPool, statModel),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("denies to convert big audio files more than 90 sec", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 90;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        mockTgReceiveMessages(telegramServer, tgMessage.chatId, statModel.langId, [
          [
            TranslationKeys.LongVoiceMessage,
            {
              duration: "1 min 30 sec",
            },
          ],
        ]),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on an audio message with wrong mime type", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 20;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration, "broken/test");
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        mockTgReceiveMessages(telegramServer, tgMessage.chatId, statModel.langId, [
          TranslationKeys.AudioNotSupportedMessage,
          [TranslationKeys.SupportedFormatsMessage, { formats: getSupportedAudioFormats() }],
          TranslationKeys.SupportedFormatsMessageExplanation,
        ]),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on an audio message with broken duration", () => {
      const voiceFileId = asFileId__test("some-file-id");
      tgMessage.setAudio(testMessageId, voiceFileId, -38);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.NoContent,
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("converts video_note into text (it fits 90 sec limit)", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;
      const voiceFileContent = "supergroup";
      tgMessage.setVideoNote(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      const speechScope = mockSpeechRecognition(voiceFileContent);
      setCurrentMockFileId(voiceFileId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.InProgress,
        ),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `🗣 ${voiceFileContent}`,
        ),
        mockUpdateBotStatUsage(testPool, statModel),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("denies to convert big video_note files more than 90 sec", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 90;
      tgMessage.setVideoNote(testMessageId, voiceFileId, voiceFileDuration);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        mockTgReceiveMessages(telegramServer, tgMessage.chatId, statModel.langId, [
          [
            TranslationKeys.LongVoiceMessage,
            {
              duration: "1 min 30 sec",
            },
          ],
        ]),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on an video_note message with broken duration", () => {
      const voiceFileId = asFileId__test("some-file-id");
      tgMessage.setVideoNote(testMessageId, voiceFileId, -38);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          TranslationKeys.NoContent,
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });
  });
});
