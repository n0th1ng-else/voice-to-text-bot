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
import { appVersion, launchTime, telegramBotName } from "../src/env";
import {
  LanguageCode,
  VoiceConverterOptions,
  VoiceConverterProvider,
} from "../src/recognition/types";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../src/recognition";
import { TelegramBotModel } from "../src/telegram/bot";
import {
  githubUrl,
  localhostUrl,
  officialChannelAccount,
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
  mockTgReceiveUnexpectedMessage,
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

const appPort = 3500;
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
bot.setHostLocation(hostUrl, launchTime);

const telegramServer = nock(TelegramApi.url);
const host = request(hostUrl);

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

const testLangId = LanguageCode.Ru;
let chatType: TgChatType = TgChatType.Channel;
let testMessageId = 0;
let testChatId = 0;
let tgMessage: TelegramMessageModel = new TelegramMessageModel(
  testChatId,
  chatType
);
let botStat = new BotStatRecordModel(tgMessage.chatId, testLangId);

describe("[russian language]", () => {
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
    chatType = TgChatType.Channel;
    testMessageId = randomIntFromInterval(1, 100000);
    testChatId = 0 - randomIntFromInterval(1, 100000);
  });

  afterEach(() => {
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
  });

  describe("groups and channels", () => {
    beforeEach(() => {
      tgMessage = new TelegramMessageModel(testChatId, chatType);
      botStat = new BotStatRecordModel(tgMessage.chatId, testLangId);
      botStat.setObjectId(randomIntFromInterval(1, 100000));
    });

    it("keeps calm on a message without voice content", () => {
      tgMessage.setText(testMessageId, "some text");

      return Promise.all([sendTelegramMessage(host, bot, tgMessage)]);
    });

    it("responds on a /start message", () => {
      tgMessage.setText(testMessageId, BotCommand.Start);
      const statModel = mockGetBotStatItem(
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
            LabelId.DonateMessage,
          ]
        ),
      ]);
    });

    it("responds on a /start message with bot name", () => {
      tgMessage.setText(
        testMessageId,
        `${BotCommand.Start}@${telegramBotName}`
      );
      const statModel = mockGetBotStatItem(
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
            LabelId.DonateMessage,
          ]
        ),
      ]);
    });

    it("responds on a /support message", () => {
      tgMessage.setText(testMessageId, BotCommand.Support);
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
          LabelId.SupportCommand,
          new TelegramMessageMeta(TelegramMessageMetaType.Link, [
            new TelegramMessageMetaItem(
              LabelId.OfficialChannel,
              officialChannelAccount
            ),
            new TelegramMessageMetaItem(LabelId.GithubIssues, githubUrl),
          ])
        ),
      ]);
    });

    it("responds on a /support message with bot name", () => {
      tgMessage.setText(
        testMessageId,
        `${BotCommand.Support}@${telegramBotName}`
      );
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
          LabelId.SupportCommand,
          new TelegramMessageMeta(TelegramMessageMetaType.Link, [
            new TelegramMessageMetaItem(
              LabelId.OfficialChannel,
              officialChannelAccount
            ),
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
            new TelegramMessageMetaItem(
              LabelId.OfficialChannel,
              officialChannelAccount
            ),
            new TelegramMessageMetaItem(LabelId.ContactAuthor, authorUrl),
            new TelegramMessageMetaItem(LabelId.GithubIssues, githubUrl),
          ])
        ),
      ]);
    });

    it("responds on a /support message with author url and with bot name", () => {
      const authorUrl = "some-author-url";
      bot.setAuthor(authorUrl);
      tgMessage.setText(
        testMessageId,
        `${BotCommand.Support}@${telegramBotName}`
      );

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
          LabelId.SupportCommand,
          new TelegramMessageMeta(TelegramMessageMetaType.Link, [
            new TelegramMessageMetaItem(
              LabelId.OfficialChannel,
              officialChannelAccount
            ),
            new TelegramMessageMetaItem(LabelId.ContactAuthor, authorUrl),
            new TelegramMessageMetaItem(LabelId.GithubIssues, githubUrl),
          ])
        ),
      ]);
    });

    it("responds on a /lang message", () => {
      tgMessage.setText(testMessageId, BotCommand.Language);
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
          LabelId.ChangeLangTitle,
          new TelegramMessageMeta(TelegramMessageMetaType.Button, [
            new TelegramMessageMetaItem(LabelId.BtnRussian, LanguageCode.Ru),
            new TelegramMessageMetaItem(LabelId.BtnEnglish, LanguageCode.En),
          ])
        ),
      ]);
    });

    it("responds on a /lang message with bot name", () => {
      tgMessage.setText(
        testMessageId,
        `${BotCommand.Language}@${telegramBotName}`
      );
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
        const newLangId = LanguageCode.Ru;
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
          mockUpdateBotStatLang(testPool, statModel, newLangId),
        ]);
      });
    });

    it("changes language using the /lang callback message with bot name", () => {
      tgMessage.setText(
        testMessageId,
        `${BotCommand.Language}@${telegramBotName}`
      );
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
          mockUpdateBotStatLang(testPool, statModel, newLangId),
        ]);
      });
    });

    it("responds on a /fund message", () => {
      tgMessage.setText(testMessageId, BotCommand.Fund);
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

    it("responds on a /fund message with bot name", () => {
      tgMessage.setText(testMessageId, `${BotCommand.Fund}@${telegramBotName}`);
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

    it("converts voice into text (it fits 60s limit) - no username", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 59;
      const voiceFileContent = "supergroup";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `🗣 ${voiceFileContent}`
        ),
        mockUpdateBotStatUsage(testPool, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("converts voice into text (it fits 60s limit) - has username", () => {
      const voiceFileId = "some-file-id-new";
      const voiceFileDuration = randomIntFromInterval(1, 59);
      const voiceFileContent = "supergroup";
      const userName = "test-user";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      tgMessage.setName(testMessageId, { userName });
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${userName} 🗣 ${voiceFileContent}`
        ),
        mockUpdateBotStatUsage(testPool, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("converts voice into text (it fits 60s limit) - has first name", () => {
      const voiceFileId = "some-file-id-new";
      const voiceFileDuration = randomIntFromInterval(1, 59);
      const voiceFileContent = "supergroup";
      const userName = "test-user-n2";
      const firstName = "my-first-name";

      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      tgMessage.setName(testMessageId, {
        userName,
        firstName,
      });
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${firstName} 🗣 ${voiceFileContent}`
        ),
        mockUpdateBotStatUsage(testPool, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("converts voice into text (it fits 60s limit) - has last name", () => {
      const voiceFileId = "some-file-id-new";
      const voiceFileDuration = randomIntFromInterval(1, 59);
      const voiceFileContent = "supergroup";
      const userName = "test-user-n3";
      const lastName = "his-last-account";

      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      tgMessage.setName(testMessageId, {
        userName,
        lastName,
      });
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${lastName} 🗣 ${voiceFileContent}`
        ),
        mockUpdateBotStatUsage(testPool, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("converts voice into text (it fits 60s limit) - has both first and last name", () => {
      const voiceFileId = "some-file-id-new";
      const voiceFileDuration = randomIntFromInterval(1, 59);
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
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${firstName} ${lastName} 🗣 ${voiceFileContent}`
        ),
        mockUpdateBotStatUsage(testPool, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("keeps calm on a big voice files more than 60 sec", (done) => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 60;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      mockTgReceiveUnexpectedMessage(telegramServer, done);

      return sendTelegramMessage(host, bot, tgMessage).then(() => {
        expect(nock.pendingMocks()).toHaveLength(1);
        nock.cleanAll();
        return done && done();
      });
    });

    it("keeps calm if the message is from another bot", (done) => {
      tgMessage.setName(testMessageId, {}, true);
      mockTgReceiveUnexpectedMessage(telegramServer, done);

      return sendTelegramMessage(host, bot, tgMessage).then(() => {
        expect(nock.pendingMocks()).toHaveLength(1);
        nock.cleanAll();
        return done && done();
      });
    });

    it("keeps calm on a voice file with wrong mime type", (done) => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 59;
      tgMessage.setVoice(
        testMessageId,
        voiceFileId,
        voiceFileDuration,
        "audio/mp3"
      );

      mockTgReceiveUnexpectedMessage(telegramServer, done);

      return sendTelegramMessage(host, bot, tgMessage).then(() => {
        expect(nock.pendingMocks()).toHaveLength(1);
        nock.cleanAll();
        return done && done();
      });
    });

    it("keeps calm on a voice file with broken duration", (done) => {
      const voiceFileId = "some-file-id";
      tgMessage.setVoice(testMessageId, voiceFileId, -53);

      mockTgReceiveUnexpectedMessage(telegramServer, done);

      return sendTelegramMessage(host, bot, tgMessage).then(() => {
        expect(nock.pendingMocks()).toHaveLength(1);
        nock.cleanAll();
        return done && done();
      });
    });

    it("keeps calm on an audio file with wrong mime type", (done) => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 59;
      tgMessage.setAudio(
        testMessageId,
        voiceFileId,
        voiceFileDuration,
        "audio/wav"
      );

      mockTgReceiveUnexpectedMessage(telegramServer, done);

      return sendTelegramMessage(host, bot, tgMessage).then(() => {
        expect(nock.pendingMocks()).toHaveLength(1);
        nock.cleanAll();
        return done && done();
      });
    });

    it("keeps calm on an audio file with broken duration", (done) => {
      const voiceFileId = "some-file-id";
      tgMessage.setAudio(testMessageId, voiceFileId, -123);

      mockTgReceiveUnexpectedMessage(telegramServer, done);

      return sendTelegramMessage(host, bot, tgMessage).then(() => {
        expect(nock.pendingMocks()).toHaveLength(1);
        nock.cleanAll();
        return done && done();
      });
    });

    it("converts audio into text (it fits 60s limit) - has both first and last name", () => {
      const voiceFileId = "some-file-id-new";
      const voiceFileDuration = randomIntFromInterval(1, 59);
      const voiceFileContent = "supergroup";
      const userName = "test-user-n4";
      const firstName = "her-next-big-thing";
      const lastName = "their-number-chair";

      tgMessage.setAudio(
        testMessageId,
        voiceFileId,
        voiceFileDuration,
        "audio/x-opus+ogg"
      );
      tgMessage.setName(testMessageId, {
        userName,
        firstName,
        lastName,
      });
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat
      );

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `${firstName} ${lastName} 🗣 ${voiceFileContent}`
        ),
        mockUpdateBotStatUsage(testPool, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });
  });
});
