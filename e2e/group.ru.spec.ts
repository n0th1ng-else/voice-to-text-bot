import request from "supertest";
import nock from "nock";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mockTableCreation, Pool as MockPool } from "../src/db/__mocks__/pg.js";
import { setCurrentMockFileId } from "../src/telegram/api/__mocks__/tgMTProtoApi.js";
import type { TgChatType } from "../src/telegram/api/groups/chats/chats-types.js";
import type { LanguageCode } from "../src/recognition/types.js";
import type { VoidPromise } from "../src/common/types.js";
import {
  asChatId__test,
  asMessageId__test,
  asFileId__test,
  asUsageId__test,
} from "../src/testUtils/types.js";
import { TelegramBotModel } from "../src/telegram/bot.js";
import { getVoiceConverterInstances } from "../src/recognition/index.js";
import { githubUrl, localhostUrl, officialChannelAccount } from "../src/const.js";
import { DbClient } from "../src/db/client.js";
import { getDb } from "../src/db/index.js";
import { appVersion, launchTime, telegramBotName } from "../src/env.js";
import { TelegramBaseApi } from "../src/telegram/api/groups/core.js";
import { BotServer } from "../src/server/bot-server.js";
import { randomIntFromInterval } from "../src/common/timer.js";
import { BotCommand } from "../src/telegram/commands.js";
import { TranslationKeys } from "../src/text/types.js";
import { trackNotMatchedRoutes } from "./requests/common.js";
import { mockGoogleAuth, mockSpeechRecognition } from "./requests/google.js";
import {
  BotStatRecordModel,
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
  mockTgReceiveUnexpectedMessage,
  mockTgSetCommands,
  mockTgSetWebHook,
  sendTelegramCallbackMessage,
  sendTelegramMessage,
} from "./requests/telegram.js";
import {
  mockGetBotStatItem,
  mockUpdateBotStatLang,
  mockUpdateBotStatUsage,
} from "./requests/db/botStat.js";
import { mockGetIgnoredChatsRow } from "./requests/db/ignoredChatsDb.js";

vi.mock("../src/logger/index");
vi.mock("../src/env");
vi.mock("../src/analytics/amplitude/index");
vi.mock("../src/analytics/ga/index");
vi.mock("../src/telegram/api/tgMTProtoApi");

const appPort = 3500;
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
const testPool = new MockPool(dbConfig);
mockTableCreation(testPool);

let stopHandler: VoidPromise = () => Promise.reject(new Error("Server did not start"));

let hostUrl: string;
let bot: TelegramBotModel;
let telegramServer: nock.Scope;
let host: request.Agent;
let chatType: TgChatType;
let testMessageId = asMessageId__test(0);
let testChatId = asChatId__test(0);
let tgMessage: TelegramMessageModel;
let botStat: BotStatRecordModel;
let testLangId: LanguageCode;

describe("[russian language]", () => {
  beforeAll(async () => {
    testLangId = "ru-RU";
    mockGoogleAuth();

    const converters = await getVoiceConverterInstances("GOOGLE", "GOOGLE", getConverterOptions());
    hostUrl = `${localhostUrl}:${appPort}`;
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
    chatType = "group";
    tgMessage = new TelegramMessageModel(testChatId, chatType);

    mockTgGetWebHook(telegramServer, "https://unknown.url");
    mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
    mockTgSetCommands(telegramServer);

    const server = new BotServer(appPort, appVersion, webhookDoNotWait);

    await db.init();
    stopHandler = await server.setSelfUrl(hostUrl).setBots([bot]).setStat(db).start();
    await server.applyHostLocation();
  });

  afterAll(() => stopHandler());

  beforeEach(() => {
    bot.setAuthor("");
    chatType = "channel";
    testMessageId = asMessageId__test(randomIntFromInterval(1, 100000));
    testChatId = asChatId__test(0 - randomIntFromInterval(1, 100000));
  });

  afterEach(() => {
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
    expect(trackNotMatchedRoutesHandler()).toBe(true);
  });

  describe("groups and channels", () => {
    beforeEach(() => {
      tgMessage = new TelegramMessageModel(testChatId, chatType);
      botStat = new BotStatRecordModel(tgMessage.chatId, testLangId);
      const usageId = asUsageId__test(String(randomIntFromInterval(1, 100000)));
      botStat.setObjectId(usageId);
    });

    it("keeps calm on a message without voice content", () => {
      tgMessage.setText(testMessageId, "some text");

      return sendTelegramMessage(host, bot, tgMessage);
    });

    it("responds on a /start message", () => {
      tgMessage.setText(testMessageId, BotCommand.Start);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      return Promise.all([
        mockTgReceiveMessages(telegramServer, tgMessage.chatId, statModel.langId, [
          TranslationKeys.WelcomeMessage,
          TranslationKeys.WelcomeMessageGroup,
          TranslationKeys.WelcomeMessageMore,
          TranslationKeys.DonateMessage,
        ]),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on a /start message with bot name", () => {
      tgMessage.setText(testMessageId, `${BotCommand.Start}@${telegramBotName}`);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      return Promise.all([
        mockTgReceiveMessages(telegramServer, tgMessage.chatId, statModel.langId, [
          TranslationKeys.WelcomeMessage,
          TranslationKeys.WelcomeMessageGroup,
          TranslationKeys.WelcomeMessageMore,
          TranslationKeys.DonateMessage,
        ]),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on a /support message", () => {
      tgMessage.setText(testMessageId, BotCommand.Support);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      return Promise.all([
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
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on a /support message with bot name", () => {
      tgMessage.setText(testMessageId, `${BotCommand.Support}@${telegramBotName}`);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      return Promise.all([
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
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on a /support message with author url", () => {
      const authorUrl = "some-author-url";
      bot.setAuthor(authorUrl);
      tgMessage.setText(testMessageId, BotCommand.Support);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      return Promise.all([
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
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on a /support message with author url and with bot name", () => {
      const authorUrl = "some-author-url";
      bot.setAuthor(authorUrl);
      tgMessage.setText(testMessageId, `${BotCommand.Support}@${telegramBotName}`);

      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      return Promise.all([
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
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on a /lang message", () => {
      tgMessage.setText(testMessageId, BotCommand.Language);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

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
      ]);
    });

    it("responds on a /lang message with bot name", () => {
      tgMessage.setText(testMessageId, `${BotCommand.Language}@${telegramBotName}`);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

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
      ]);
    });

    it("changes language using the /lang callback message", () => {
      tgMessage.setText(testMessageId, BotCommand.Language);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

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

    it("changes language using the /lang callback message with bot name", () => {
      tgMessage.setText(testMessageId, `${BotCommand.Language}@${telegramBotName}`);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

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
        const newLangId: LanguageCode = "en-US";
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
      ]);
    });

    it("responds on a /donate message with bot name", () => {
      tgMessage.setText(testMessageId, `${BotCommand.Donate}@${telegramBotName}`);
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
      ]);
    });

    it("converts voice into text (it fits 90 sec limit) - no username", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;
      const voiceFileContent = "supergroup";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      const speechScope = mockSpeechRecognition(voiceFileContent);
      setCurrentMockFileId(voiceFileId);

      return Promise.all([
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `🗣 ${voiceFileContent}`,
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockUpdateBotStatUsage(testPool, statModel),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("converts voice into text (it fits 90 sec limit) - has username", () => {
      const voiceFileId = asFileId__test("some-file-id-new");
      const voiceFileDuration = randomIntFromInterval(1, 89);
      const voiceFileContent = "supergroup";
      const userName = "test-user";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      tgMessage.setName(testMessageId, { userName });
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      const speechScope = mockSpeechRecognition(voiceFileContent);
      setCurrentMockFileId(voiceFileId);

      return Promise.all([
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${userName} 🗣 ${voiceFileContent}`,
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockUpdateBotStatUsage(testPool, statModel),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("converts voice into text (it fits 90 sec limit) - has first name", () => {
      const voiceFileId = asFileId__test("some-file-id-new");
      const voiceFileDuration = randomIntFromInterval(1, 89);
      const voiceFileContent = "supergroup";
      const userName = "test-user-n2";
      const firstName = "my-first-name";

      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      tgMessage.setName(testMessageId, {
        userName,
        firstName,
      });
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      const speechScope = mockSpeechRecognition(voiceFileContent);
      setCurrentMockFileId(voiceFileId);

      return Promise.all([
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${firstName} 🗣 ${voiceFileContent}`,
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockUpdateBotStatUsage(testPool, statModel),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("converts voice into text (it fits 90 sec limit) - has last name", () => {
      const voiceFileId = asFileId__test("some-file-id-new");
      const voiceFileDuration = randomIntFromInterval(1, 89);
      const voiceFileContent = "supergroup";
      const userName = "test-user-n3";
      const lastName = "his-last-account";

      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      tgMessage.setName(testMessageId, {
        userName,
        lastName,
      });
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      const speechScope = mockSpeechRecognition(voiceFileContent);
      setCurrentMockFileId(voiceFileId);

      return Promise.all([
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${lastName} 🗣 ${voiceFileContent}`,
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockUpdateBotStatUsage(testPool, statModel),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("converts voice into text (it fits 90 sec limit) - has both first and last name", () => {
      const voiceFileId = asFileId__test("some-file-id-new");
      const voiceFileDuration = randomIntFromInterval(1, 89);
      const voiceFileContent = "supergroup";
      const userName = "test-user-n4";
      const firstName = "her-next-big-thing";
      const lastName = "their-number-chair";

      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      tgMessage.setName(testMessageId, {
        userName,
        firstName,
        lastName,
      });
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      const speechScope = mockSpeechRecognition(voiceFileContent);
      setCurrentMockFileId(voiceFileId);

      return Promise.all([
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${firstName} ${lastName} 🗣 ${voiceFileContent}`,
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockUpdateBotStatUsage(testPool, statModel),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("keeps calm on a big voice files more than 90 sec", () => {
      return new Promise<void>((resolve, reject) => {
        const voiceFileId = asFileId__test("some-file-id");
        const voiceFileDuration = 90;
        tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
        mockTgReceiveUnexpectedMessage(telegramServer, reject);

        // eslint-disable-next-line
        sendTelegramMessage(host, bot, tgMessage).then(() => {
          expect(nock.pendingMocks()).toHaveLength(1);
          nock.cleanAll();
          return resolve();
        });
      });
    });

    it("keeps calm if the message is from another bot", () => {
      return new Promise<void>((resolve, reject) => {
        tgMessage.setName(testMessageId, {}, true);
        mockTgReceiveUnexpectedMessage(telegramServer, reject);

        // eslint-disable-next-line
        sendTelegramMessage(host, bot, tgMessage).then(() => {
          expect(nock.pendingMocks()).toHaveLength(1);
          nock.cleanAll();
          return resolve();
        });
      });
    });

    it("keeps calm on a voice file with wrong mime type", () => {
      return new Promise<void>((resolve, reject) => {
        const voiceFileId = asFileId__test("some-file-id");
        const voiceFileDuration = 59;
        tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration, "audio/mp3");

        mockTgReceiveUnexpectedMessage(telegramServer, reject);

        // eslint-disable-next-line
        sendTelegramMessage(host, bot, tgMessage).then(() => {
          expect(nock.pendingMocks()).toHaveLength(1);
          nock.cleanAll();
          return resolve();
        });
      });
    });

    it("keeps calm on a voice file with broken duration", () => {
      return new Promise<void>((resolve, reject) => {
        const voiceFileId = asFileId__test("some-file-id");
        tgMessage.setVoice(testMessageId, voiceFileId, -53);

        mockTgReceiveUnexpectedMessage(telegramServer, reject);

        // eslint-disable-next-line
        sendTelegramMessage(host, bot, tgMessage).then(() => {
          expect(nock.pendingMocks()).toHaveLength(1);
          nock.cleanAll();
          return resolve();
        });
      });
    });

    it("keeps calm on an audio file with wrong mime type", () => {
      return new Promise<void>((resolve, reject) => {
        const voiceFileId = asFileId__test("some-file-id");
        const voiceFileDuration = 59;
        tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration, "audio/wav");

        mockTgReceiveUnexpectedMessage(telegramServer, reject);

        // eslint-disable-next-line
        sendTelegramMessage(host, bot, tgMessage).then(() => {
          expect(nock.pendingMocks()).toHaveLength(1);
          nock.cleanAll();
          return resolve();
        });
      });
    });

    it("keeps calm on an audio file with broken duration", () => {
      return new Promise<void>((resolve, reject) => {
        const voiceFileId = asFileId__test("some-file-id");
        tgMessage.setAudio(testMessageId, voiceFileId, -123);

        mockTgReceiveUnexpectedMessage(telegramServer, reject);

        // eslint-disable-next-line
        sendTelegramMessage(host, bot, tgMessage).then(() => {
          expect(nock.pendingMocks()).toHaveLength(1);
          nock.cleanAll();
          return resolve();
        });
      });
    });

    it("converts audio into text (it fits 90 sec limit) - has both first and last name", () => {
      const voiceFileId = asFileId__test("some-file-id-new");
      const voiceFileDuration = randomIntFromInterval(1, 89);
      const voiceFileContent = "supergroup";
      const userName = "test-user-n4";
      const firstName = "her-next-big-thing";
      const lastName = "their-number-chair";

      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration, "audio/x-opus+ogg");
      tgMessage.setName(testMessageId, {
        userName,
        firstName,
        lastName,
      });
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      const speechScope = mockSpeechRecognition(voiceFileContent);
      setCurrentMockFileId(voiceFileId);

      return Promise.all([
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${firstName} ${lastName} 🗣 ${voiceFileContent}`,
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockUpdateBotStatUsage(testPool, statModel),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("converts video_note into text (it fits 90 sec limit) - has first name", () => {
      const voiceFileId = asFileId__test("some-file-id-new");
      const voiceFileDuration = randomIntFromInterval(1, 89);
      const voiceFileContent = "supergroup";
      const userName = "test-user-n2";
      const firstName = "my-first-name";

      tgMessage.setVideoNote(testMessageId, voiceFileId, voiceFileDuration);
      tgMessage.setName(testMessageId, {
        userName,
        firstName,
      });
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, botStat.langId, botStat);

      const speechScope = mockSpeechRecognition(voiceFileContent);
      setCurrentMockFileId(voiceFileId);

      return Promise.all([
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${firstName} 🗣 ${voiceFileContent}`,
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockUpdateBotStatUsage(testPool, statModel),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });
  });
});
