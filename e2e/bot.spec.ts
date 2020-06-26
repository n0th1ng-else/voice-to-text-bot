import request from "supertest";
import nock from "nock";
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
import { githubUrl, localhostUrl, telegramUrl } from "../src/const";
import {
  getMockCertificate,
  TelegramChatType,
  TelegramMessageMeta,
  TelegramMessageMetaItem,
  TelegramMessageMetaType,
  TelegramMessageModel,
} from "./helpers";
import { LabelId } from "../src/text/labels";
import {
  mockTgGetFileUrl,
  mockTgReceiveMessage,
  mockTgReceiveMessages,
  mockTgReceiveRawMessage,
  mockTgSetWebHook,
  sendTelegramMessage,
} from "./requests/telegram";
import {
  mockGetBotStatItem,
  mockUpdateBotStatUsage,
} from "./requests/db/botStat";
import { randomIntFromInterval } from "../src/common/timer";
import { BotCommand } from "../src/telegram/types";
import { mockGoogleAuth, mockSpeechRecognition } from "./requests/google";

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

const appPort = 3100;
const dbPort = appPort + 1;

const hostUrl = `${localhostUrl}:${appPort}`;
const dbUrl = `${localhostUrl}:${dbPort}`;

const enableSSL = false;

const stat = new StatisticApi(dbUrl, "db-app", "db-key", "db-master", 0);

const bot = new TelegramBotModel("telegram-api-token", converter, stat);
bot.setHostLocation(hostUrl);

const telegramServer = nock(telegramUrl);
const dbServer = nock(dbUrl);
const host = request(hostUrl);

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

let chatType: TelegramChatType = TelegramChatType.Private;
let testMessageId = 0;
let testChatId = 0;
let testLangId = LanguageCode.Ru;
let tgMessage: TelegramMessageModel = new TelegramMessageModel(
  testChatId,
  chatType
);

describe("[bot]", () => {
  beforeAll(() => {
    mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);

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
    chatType = TelegramChatType.Private;
    testMessageId =
      randomIntFromInterval(1, 100000) *
      (chatType === TelegramChatType.Private ? 1 : -1);
    testChatId = randomIntFromInterval(1, 100000);
    testLangId = LanguageCode.Ru;
  });

  afterEach(() => {
    expect(dbServer.isDone()).toBeTruthy();
    expect(telegramServer.isDone()).toBeTruthy();
  });

  describe("private messages", () => {
    beforeEach(() => {
      tgMessage = new TelegramMessageModel(testChatId, chatType);
    });

    it("responds on a message without voice content", () => {
      tgMessage.setText(testMessageId, "some text");
      mockGetBotStatItem(dbServer, tgMessage.chatId, testLangId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          testLangId,
          LabelId.NoContent
        ),
      ]);
    });

    it("responds on a /start message", () => {
      tgMessage.setText(testMessageId, BotCommand.Start);
      mockGetBotStatItem(dbServer, tgMessage.chatId, testLangId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessages(telegramServer, tgMessage.chatId, testLangId, [
          LabelId.WelcomeMessage,
          LabelId.WelcomeMessageGroup,
          LabelId.WelcomeMessageMore,
        ]),
      ]);
    });

    it("responds on a /support message", () => {
      tgMessage.setText(testMessageId, BotCommand.Support);
      mockGetBotStatItem(dbServer, tgMessage.chatId, testLangId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          testLangId,
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
      mockGetBotStatItem(dbServer, tgMessage.chatId, testLangId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          testLangId,
          LabelId.SupportCommand,
          new TelegramMessageMeta(TelegramMessageMetaType.Link, [
            new TelegramMessageMetaItem(LabelId.GithubIssues, githubUrl),
            new TelegramMessageMetaItem(LabelId.ContactAuthor, authorUrl),
          ])
        ),
      ]);
    });

    it("responds on a /lang message", () => {
      tgMessage.setText(testMessageId, BotCommand.Language);
      mockGetBotStatItem(dbServer, tgMessage.chatId, testLangId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          testLangId,
          LabelId.ChangeLangTitle,
          new TelegramMessageMeta(TelegramMessageMetaType.Button, [
            new TelegramMessageMetaItem(LabelId.BtnRussian, testLangId),
            new TelegramMessageMetaItem(LabelId.BtnEnglish, LanguageCode.En),
          ])
        ),
      ]);
    });

    it("converts voice into text (it fits 60s limit)", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 59;
      const voiceFileContent = "supergroup";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      const botStat = mockGetBotStatItem(
        dbServer,
        tgMessage.chatId,
        testLangId
      );

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          testLangId,
          LabelId.InProgress
        ),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          testLangId,
          `🗣 ${voiceFileContent}`
        ),
        mockUpdateBotStatUsage(dbServer, botStat, testLangId),
      ]).then(() => {
        expect(speechScope.isDone()).toBeTruthy();
      });
    });

    it("denies to convert big voice files more than 60 sec", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 60;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      mockGetBotStatItem(dbServer, tgMessage.chatId, testLangId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessages(telegramServer, tgMessage.chatId, testLangId, [
          LabelId.LongVoiceMessage,
        ]),
      ]);
    });
  });
});
