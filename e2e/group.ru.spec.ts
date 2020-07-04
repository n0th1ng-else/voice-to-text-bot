import request from "supertest";
import nock from "nock";
import { ExpressServer } from "../src/server/express";
import { appVersion, telegramBotName } from "../src/env";
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
  BotStatRecordModel,
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
  mockTgReceiveCallbackMessage,
  mockTgReceiveMessage,
  mockTgReceiveMessages,
  mockTgReceiveRawMessage,
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

const testLangId = LanguageCode.Ru;
let chatType: TelegramChatType = TelegramChatType.Channel;
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
    chatType = TelegramChatType.Group;
    testMessageId = randomIntFromInterval(1, 100000);
    testChatId = 0 - randomIntFromInterval(1, 100000);
  });

  afterEach(() => {
    expect(dbServer.isDone()).toBeTruthy();
    expect(telegramServer.isDone()).toBeTruthy();
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
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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

    it("responds on a /start message with bot name", () => {
      tgMessage.setText(
        testMessageId,
        `${BotCommand.Start}@${telegramBotName}`
      );
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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

    it("responds on a /support message with bot name", () => {
      tgMessage.setText(
        testMessageId,
        `${BotCommand.Support}@${telegramBotName}`
      );
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.SupportCommand,
          new TelegramMessageMeta(TelegramMessageMetaType.Link, [
            new TelegramMessageMetaItem(LabelId.GithubIssues, githubUrl),
            new TelegramMessageMetaItem(LabelId.ContactAuthor, authorUrl),
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

      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
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
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
      ]).then(() => {
        const cbMessage = new TelegramMessageModel(testChatId, chatType);
        const newLangId = LanguageCode.Ru;
        cbMessage.setCallbackData(tgMessage.messageId + 1, newLangId);
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

    it("changes language using the /lang callback message with bot name", () => {
      tgMessage.setText(
        testMessageId,
        `${BotCommand.Language}@${telegramBotName}`
      );
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
      ]).then(() => {
        const cbMessage = new TelegramMessageModel(testChatId, chatType);
        const newLangId = LanguageCode.En;
        cbMessage.setCallbackData(tgMessage.messageId + 1, newLangId);
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

    it("converts voice into text (it fits 60s limit) - no username", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 59;
      const voiceFileContent = "supergroup";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
        mockUpdateBotStatUsage(dbServer, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBeTruthy();
      });
    });

    it("converts voice into text (it fits 60s limit) - has username", () => {
      const voiceFileId = "some-file-id-new";
      const voiceFileDuration = randomIntFromInterval(1, 59);
      const voiceFileContent = "supergroup";
      const userName = "test-user";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      tgMessage.setName(testMessageId, { userName });
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
        mockUpdateBotStatUsage(dbServer, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBeTruthy();
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
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
        mockUpdateBotStatUsage(dbServer, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBeTruthy();
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
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
        mockUpdateBotStatUsage(dbServer, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBeTruthy();
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
      const statModel = mockGetBotStatItem(dbServer, tgMessage.chatId, botStat);

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
        mockUpdateBotStatUsage(dbServer, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBeTruthy();
      });
    });

    it("keeps calm on a big voice files more than 60 sec", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 60;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      return sendTelegramMessage(host, bot, tgMessage);
    });

    it("keeps calm if the message is from another bot", () => {
      tgMessage.setName(testMessageId, {}, true);

      return sendTelegramMessage(host, bot, tgMessage);
    });
  });
});
