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
import { appVersion } from "../src/env";
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
import { githubUrl, localhostUrl } from "../src/const";
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

jest.mock("../src/logger");

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

const stat = new StatisticApi(dbUrl, "db-app", "db-key", "db-master", 0);

const bot = new TelegramBotModel("telegram-api-token", converter, stat);
bot.setHostLocation(hostUrl);

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
    mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
    mockTgSetCommands(telegramServer);

    const server = new ExpressServer(appPort, enableSSL, appVersion);
    return server
      .setSelfUrl(hostUrl)
      .setBots([bot])
      .setStat(stat)
      .start()
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
    expect(dbServer.isDone()).toBeTruthy();
    expect(telegramServer.isDone()).toBeTruthy();
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
          mockUpdateBotStatLang(dbServer, statModel, newLangId),
        ]);
      });
    });

    it("converts voice into text (it fits 60s limit)", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 59;
      const voiceFileContent = "supergroup";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      botStat.usageCount = 37;

      const statModel = mockGetBotStatItem(
        dbServer,
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
        mockUpdateBotStatUsage(dbServer, statModel),
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
  });
});
