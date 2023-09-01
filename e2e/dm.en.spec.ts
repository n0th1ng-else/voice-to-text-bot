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
import { Pool as MockPool } from "../src/db/__mocks__/pg.js";
import type { TgChatType } from "../src/telegram/api/types.js";
import type { LanguageCode } from "../src/recognition/types.js";
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

const enableSSL = false;
const appPort = 3100;
const dbPort = appPort + 1;

let stopHandler: VoidPromise = () =>
  Promise.reject(new Error("Server did not start"));

let chatType: TgChatType;
let testMessageId = 0;
let testChatId = 0;
let tgMessage: InstanceType<InjectedTestFn["TelegramMessageModel"]>;
let bot: InstanceType<InjectedFn["TelegramBotModel"]>;
let telegramServer: nock.Scope;
let TelegramMessageModel: InjectedTestFn["TelegramMessageModel"];
let testPool: MockPool;
let randomIntFromInterval: InjectedFn["randomIntFromInterval"];
let mockGetBotStatItem: InjectedTestFn["mockGetBotStatItem"];
let host: request.SuperTest<request.Test>;
let LabelId: InjectedFn["LabelId"];
let sendTelegramMessage: InjectedTestFn["sendTelegramMessage"];
let mockTgReceiveMessage: InjectedTestFn["mockTgReceiveMessage"];
let BotCommand: InjectedFn["BotCommand"];
let mockTgReceiveMessages: InjectedTestFn["mockTgReceiveMessages"];
let TelegramMessageMetaItem: InjectedTestFn["TelegramMessageMetaItem"];
let TelegramMessageMetaType: InjectedTestFn["TelegramMessageMetaType"];
let officialChannelAccount: InjectedFn["officialChannelAccount"];
let githubUrl: InjectedFn["githubUrl"];
let getLangButtons: InjectedTestFn["getLangButtons"];
let getDonateButtons: InjectedTestFn["getDonateButtons"];
let sendTelegramCallbackMessage: InjectedTestFn["sendTelegramCallbackMessage"];
let mockTgReceiveCallbackMessage: InjectedTestFn["mockTgReceiveCallbackMessage"];
let mockUpdateBotStatLang: InjectedTestFn["mockUpdateBotStatLang"];
let mockTgReceiveRawMessage: InjectedTestFn["mockTgReceiveRawMessage"];
let mockSpeechRecognition: InjectedTestFn["mockSpeechRecognition"];
let mockTgGetFileUrl: InjectedTestFn["mockTgGetFileUrl"];
let mockUpdateBotStatUsage: InjectedTestFn["mockUpdateBotStatUsage"];

describe("[default language - english]", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    const initTest = await injectTestDependencies();
    randomIntFromInterval = init.randomIntFromInterval;
    TelegramMessageModel = initTest.TelegramMessageModel;
    BotCommand = init.BotCommand;
    mockGetBotStatItem = initTest.mockGetBotStatItem;
    sendTelegramMessage = initTest.sendTelegramMessage;
    mockTgReceiveMessage = initTest.mockTgReceiveMessage;
    LabelId = init.LabelId;
    sendTelegramCallbackMessage = initTest.sendTelegramCallbackMessage;
    randomIntFromInterval = init.randomIntFromInterval;
    mockTgReceiveMessages = initTest.mockTgReceiveMessages;
    TelegramMessageMetaItem = initTest.TelegramMessageMetaItem;
    TelegramMessageMetaType = initTest.TelegramMessageMetaType;
    sendTelegramCallbackMessage = initTest.sendTelegramCallbackMessage;
    officialChannelAccount = init.officialChannelAccount;
    githubUrl = init.githubUrl;
    getLangButtons = initTest.getLangButtons;
    mockTgReceiveCallbackMessage = initTest.mockTgReceiveCallbackMessage;
    mockUpdateBotStatLang = initTest.mockUpdateBotStatLang;
    mockSpeechRecognition = initTest.mockSpeechRecognition;
    getDonateButtons = initTest.getDonateButtons;
    mockTgReceiveRawMessage = initTest.mockTgReceiveRawMessage;
    mockTgGetFileUrl = initTest.mockTgGetFileUrl;
    mockUpdateBotStatUsage = initTest.mockUpdateBotStatUsage;

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
    const ExpressServer = init.ExpressServer;
    const appVersion = init.appVersion;
    const httpsOptions = init.httpsOptions;
    const NodesSql = init.NodesSql;
    const UsagesSql = init.UsagesSql;
    const DonationsSql = init.DonationsSql;
    const UsedEmailsSql = init.UsedEmailsSql;
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
    const mainDb = new DbClient(dbConfig, 0, testPool);
    const db = getDb([dbConfig], 0, mainDb);

    bot = new TelegramBotModel("telegram-api-token", converter, db);
    bot.setHostLocation(hostUrl, launchTime);

    telegramServer = nock(TelegramApi.url);
    host = request(hostUrl);

    chatType = "private";
    tgMessage = new TelegramMessageModel(testChatId, chatType);

    mockTgGetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);

    const server = new ExpressServer(
      appPort,
      enableSSL,
      appVersion,
      httpsOptions,
    );

    testPool.mockQuery(NodesSql.createTable, () => Promise.resolve());
    testPool.mockQuery(UsagesSql.createTable, () => Promise.resolve());
    testPool.mockQuery(DonationsSql.createTable, () => Promise.resolve());
    testPool.mockQuery(UsedEmailsSql.createTable, () => Promise.resolve());

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
    chatType = "private";
    testMessageId = randomIntFromInterval(1, 100000);
    testChatId = randomIntFromInterval(1, 100000);
  });

  afterEach(() => {
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
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
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.NoContent,
        ),
      ]);
    });

    it("detects user language from the message (RU)", () => {
      tgMessage.setText(testMessageId, "some text");
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "ru-RU");
      tgMessage.setName(123323, {}, false, "ru");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.NoContent,
        ),
      ]);
    });

    it("Falls back to EN for non-RU languages", () => {
      tgMessage.setText(testMessageId, "some text");
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");
      tgMessage.setName(123323, {}, false, "es");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.NoContent,
        ),
      ]);
    });

    it("responds on a /start message", () => {
      tgMessage.setText(testMessageId, BotCommand.Start);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

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
          ],
        ),
      ]);
    });

    it("responds on a /support message", () => {
      tgMessage.setText(testMessageId, BotCommand.Support);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.SupportCommand,
          [
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.OfficialChannel,
                officialChannelAccount,
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.GithubIssues,
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
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.SupportCommand,
          [
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.OfficialChannel,
                officialChannelAccount,
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.ContactAuthor,
                authorUrl,
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.GithubIssues,
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
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.ChangeLangTitle,
          getLangButtons(),
        ),
      ]);
    });

    it("changes language using the /lang callback message", () => {
      tgMessage.setText(testMessageId, BotCommand.Language);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.ChangeLangTitle,
          getLangButtons(),
        ),
      ]).then(([, prefixId]) => {
        const cbMessage = new TelegramMessageModel(testChatId, chatType);
        const newLangId: LanguageCode = "ru-RU";
        cbMessage.setLangCallback(tgMessage.messageId + 1, newLangId, prefixId);
        return Promise.all([
          sendTelegramCallbackMessage(host, bot, cbMessage),
          mockTgReceiveCallbackMessage(
            telegramServer,
            tgMessage.chatId,
            cbMessage.messageId,
            newLangId,
            LabelId.ChangeLang,
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
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.DonateCommandMessage,
          getDonateButtons(),
        ),
      ]);
    });

    it("converts voice into text (it fits 90 sec limit)", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 89;
      const voiceFileContent = "supergroup";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.InProgress,
        ),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `🗣 ${voiceFileContent}`,
        ),
        mockUpdateBotStatUsage(testPool, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("denies to convert big voice files more than 90 sec", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 90;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [LabelId.LongVoiceMessage],
        ),
      ]);
    });

    it("does nothing if the message is from another bot", () => {
      tgMessage.setName(testMessageId, {}, true);

      return Promise.all([sendTelegramMessage(host, bot, tgMessage)]);
    });

    it("responds on a voice message with wrong mime type", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 20;
      tgMessage.setVoice(
        testMessageId,
        voiceFileId,
        voiceFileDuration,
        "broken/type",
      );
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

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
          ],
        ),
      ]);
    });

    it("responds on a voice message with broken duration", () => {
      const voiceFileId = "some-file-id";
      tgMessage.setVoice(testMessageId, voiceFileId, -1);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.NoContent,
        ),
      ]);
    });

    it("converts audio into text (it fits 90 sec limit)", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 89;
      const voiceFileContent = "supergroup";
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      const speechScope = mockSpeechRecognition(voiceFileContent);
      mockTgGetFileUrl(telegramServer, tgMessage.voiceId);

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.InProgress,
        ),
        mockTgReceiveRawMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          `🗣 ${voiceFileContent}`,
        ),
        mockUpdateBotStatUsage(testPool, statModel),
      ]).then(() => {
        expect(speechScope.isDone()).toBe(true);
      });
    });

    it("denies to convert big audio files more than 90 sec", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 90;
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [LabelId.LongVoiceMessage],
        ),
      ]);
    });

    it("responds on an audio message with wrong mime type", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 20;
      tgMessage.setAudio(
        testMessageId,
        voiceFileId,
        voiceFileDuration,
        "broken/test",
      );
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

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
          ],
        ),
      ]);
    });

    it("responds on an audio message with broken duration", () => {
      const voiceFileId = "some-file-id";
      tgMessage.setAudio(testMessageId, voiceFileId, -38);
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessage(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          LabelId.NoContent,
        ),
      ]);
    });
  });
});
