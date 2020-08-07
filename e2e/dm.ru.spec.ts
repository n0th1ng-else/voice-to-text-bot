import request from "supertest";
import nock from "nock";
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
import { ExpressServer } from "../src/server/express";
import { appVersion, launchTime } from "../src/env";
import {
  LanguageCode,
  VoiceConverterOptions,
  VoiceConverterProvider,
} from "../src/recognition/types";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../src/recognition";
import { StatisticApi } from "../src/statistic";
import { TelegramBotModel } from "../src/telegram/bot";
import {
  githubUrl,
  localhostUrl,
  patreonAccount,
  yandexAccount,
} from "../src/const";
import {
  BotStatRecordModel,
  getMockCertificate,
  TelegramMessageMeta,
  TelegramMessageMetaItem,
  TelegramMessageMetaType,
  TelegramMessageModel,
} from "./helpers";
import { LabelId } from "../src/text/labels";
import {
  mockTgGetFileUrl,
  mockTgGetWebHook,
  mockTgReceiveCallbackMessage,
  mockTgReceiveMessage,
  mockTgReceiveMessages,
  mockTgReceiveRawMessage,
  mockTgSetCommands,
  mockTgSetWebHook,
  sendTelegramCallbackMessage,
  sendTelegramMessage,
} from "./requests/telegram";
import {
  mockGetBotStatItem,
  mockUpdateBotStatLang,
  mockUpdateBotStatUsage,
} from "./requests/db/botStat";
import { randomIntFromInterval } from "../src/common/timer";
import { BotCommand } from "../src/telegram/types";
import { mockGoogleAuth, mockSpeechRecognition } from "./requests/google";
import { TgChatType } from "../src/telegram/api/types";
import { TelegramApi } from "../src/telegram/api";
import { httpsOptions } from "../certs";
import { Pool as MockPool } from "../src/db/__mocks__/pg";
import { DbClient } from "../src/db";
import { NodesSql } from "../src/db/sql/nodes.sql";
import { UsagesSql } from "../src/db/sql/usages.sql";

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

const appPort = 3200;
const dbPort = appPort + 1;

const hostUrl = `${localhostUrl}:${appPort}`;
const dbUrl = `${localhostUrl}:${dbPort}`;

const enableSSL = false;

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: 5432,
};
const testPool = new MockPool(dbConfig);
const db = new DbClient(dbConfig, testPool);

const stat = new StatisticApi(
  dbUrl,
  "db-app",
  "db-key",
  "db-master",
  0
).connect(db);

const bot = new TelegramBotModel("telegram-api-token", converter, stat);
bot.setHostLocation(hostUrl, launchTime);

const telegramServer = nock(TelegramApi.url);
const dbServer = nock(dbUrl);
const host = request(hostUrl);

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

const testLangId = LanguageCode.Ru;
let chatType: TgChatType = TgChatType.Private;
let testMessageId = 0;
let testChatId = 0;
let tgMessage: TelegramMessageModel = new TelegramMessageModel(
  testChatId,
  chatType
);
let botStat = new BotStatRecordModel(tgMessage.chatId, testLangId);

describe("[russian language]", () => {
  beforeAll(() => {
    mockTgGetWebHook(telegramServer, "https://unknown.url");
    mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
    mockTgSetCommands(telegramServer);

    testPool.mockQuery(NodesSql.createTable, () => Promise.resolve());
    testPool.mockQuery(UsagesSql.createTable, () => Promise.resolve());

    const server = new ExpressServer(
      appPort,
      enableSSL,
      appVersion,
      httpsOptions
    );

    return db
      .init()
      .then(() =>
        server.setSelfUrl(hostUrl).setBots([bot]).setStat(stat).start()
      )
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
    testChatId = randomIntFromInterval(1, 100000);
  });

  afterEach(() => {
    expect(dbServer.isDone()).toBe(true);
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
  });

  describe("private messages", () => {
    beforeEach(() => {
      tgMessage = new TelegramMessageModel(testChatId, chatType);
      botStat = new BotStatRecordModel(tgMessage.chatId, testLangId);
      botStat.setObjectId(randomIntFromInterval(1, 100000));
    });

    it("responds on a message without voice content", () => {
      tgMessage.setText(testMessageId, "some text");
      const statModel = mockGetBotStatItem(
        dbServer,
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
          LabelId.NoContent
        ),
      ]);
    });

    it("detects user language from the message (EN)", () => {
      tgMessage.setText(testMessageId, "some text");
      const statModel = mockGetBotStatItem(
        dbServer,
        testPool,
        tgMessage.chatId,
        LanguageCode.En,
        botStat
      );
      tgMessage.setName(123323, {}, false, "en");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.NoContent
        ),
      ]);
    });

    it("responds on a /start message", () => {
      tgMessage.setText(testMessageId, BotCommand.Start);
      const statModel = mockGetBotStatItem(
        dbServer,
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            LabelId.WelcomeMessage,
            LabelId.WelcomeMessageGroup,
            LabelId.WelcomeMessageMore,
          ]
        ),
      ]);
    });

    it("responds on a /support message", () => {
      tgMessage.setText(testMessageId, BotCommand.Support);
      const statModel = mockGetBotStatItem(
        dbServer,
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
          LabelId.SupportCommand,
          new TelegramMessageMeta(TelegramMessageMetaType.Link, [
            new TelegramMessageMetaItem(LabelId.GithubIssues, githubUrl),
          ])
        ),
      ]);
    });

    it("responds on a /support message with author url", () => {
      const authorUrl = "some-author-url";
      bot.setAuthor(authorUrl);
      tgMessage.setText(testMessageId, BotCommand.Support);
      const statModel = mockGetBotStatItem(
        dbServer,
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
          LabelId.SupportCommand,
          new TelegramMessageMeta(TelegramMessageMetaType.Link, [
            new TelegramMessageMetaItem(LabelId.ContactAuthor, authorUrl),
            new TelegramMessageMetaItem(LabelId.GithubIssues, githubUrl),
          ])
        ),
      ]);
    });

    it("responds on a /lang message", () => {
      tgMessage.setText(testMessageId, BotCommand.Language);
      const statModel = mockGetBotStatItem(
        dbServer,
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
          LabelId.ChangeLangTitle,
          new TelegramMessageMeta(TelegramMessageMetaType.Button, [
            new TelegramMessageMetaItem(LabelId.BtnRussian, LanguageCode.Ru),
            new TelegramMessageMetaItem(LabelId.BtnEnglish, LanguageCode.En),
          ])
        ),
      ]);
    });

    it("changes language using the /lang callback message", () => {
      tgMessage.setText(testMessageId, BotCommand.Language);
      const statModel = mockGetBotStatItem(
        dbServer,
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
          LabelId.ChangeLangTitle,
          new TelegramMessageMeta(TelegramMessageMetaType.Button, [
            new TelegramMessageMetaItem(LabelId.BtnRussian, LanguageCode.Ru),
            new TelegramMessageMetaItem(LabelId.BtnEnglish, LanguageCode.En),
          ])
        ),
      ]).then(([, prefixId]) => {
        const cbMessage = new TelegramMessageModel(testChatId, chatType);
        const newLangId = LanguageCode.En;
        cbMessage.setCallbackData(tgMessage.messageId + 1, newLangId, prefixId);
        return Promise.all([
          sendTelegramCallbackMessage(host, bot, cbMessage),
          mockTgReceiveCallbackMessage(
            telegramServer,
            tgMessage.chatId,
            cbMessage.messageId,
            newLangId,
            LabelId.ChangeLang
          ),
          mockUpdateBotStatLang(dbServer, testPool, statModel, newLangId),
        ]);
      });
    });

    it("responds on a /fund message", () => {
      tgMessage.setText(testMessageId, BotCommand.Fund);
      const statModel = mockGetBotStatItem(
        dbServer,
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
          new TelegramMessageMeta(TelegramMessageMetaType.Link, [
            new TelegramMessageMetaItem(
              LabelId.PatreonLinkTitle,
              patreonAccount
            ),
            // new TelegramMessageMetaItem(LabelId.KofiLinkTitle, kofiAccount),
            new TelegramMessageMetaItem(LabelId.YandexLinkTitle, yandexAccount),
          ])
        ),
      ]);
    });

    it("converts voice into text (it fits 60s limit)", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 59;
      const voiceFileContent = "supergroup";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      botStat.usageCount = 37;

      const statModel = mockGetBotStatItem(
        dbServer,
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.InProgress
        ),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `🗣 ${voiceFileContent}`
        ),
        mockUpdateBotStatUsage(dbServer, testPool, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBeTruthy();
      });
    });

    it("denies to convert big voice files more than 60 sec", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 60;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      const statModel = mockGetBotStatItem(
        dbServer,
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [LabelId.LongVoiceMessage]
        ),
      ]);
    });

    it("responds on a voice message with wrong mime type", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 60;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration, "");
      const statModel = mockGetBotStatItem(
        dbServer,
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            LabelId.AudioNotSupportedMessage,
            LabelId.SupportedFormatsMessage,
            LabelId.SupportedFormatsMessageExplanation,
          ]
        ),
      ]);
    });

    it("responds on a voice message with broken duration", () => {
      const voiceFileId = "some-file-id";
      tgMessage.setVoice(
        testMessageId,
        voiceFileId,
        ("123" as unknown) as number
      );
      const statModel = mockGetBotStatItem(
        dbServer,
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
          LabelId.NoContent
        ),
      ]);
    });

    it("converts audio into text (it fits 60s limit)", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 59;
      const voiceFileContent = "supergroup";
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(
        dbServer,
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.InProgress
        ),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `🗣 ${voiceFileContent}`
        ),
        mockUpdateBotStatUsage(dbServer, testPool, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBeTruthy();
      });
    });

    it("denies to convert big audio files more than 60 sec", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 60;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);
      const statModel = mockGetBotStatItem(
        dbServer,
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [LabelId.LongVoiceMessage]
        ),
      ]);
    });

    it("responds on an audio message with wrong mime type", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 60;
      tgMessage.setAudio(
        testMessageId,
        voiceFileId,
        voiceFileDuration,
        "broken/test"
      );
      const statModel = mockGetBotStatItem(
        dbServer,
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            LabelId.AudioNotSupportedMessage,
            LabelId.SupportedFormatsMessage,
            LabelId.SupportedFormatsMessageExplanation,
          ]
        ),
      ]);
    });

    it("responds on an audio message with broken duration", () => {
      const voiceFileId = "some-file-id";
      tgMessage.setAudio(testMessageId, voiceFileId, -41);
      const statModel = mockGetBotStatItem(
        dbServer,
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
          LabelId.NoContent
        ),
      ]);
    });
  });
});
