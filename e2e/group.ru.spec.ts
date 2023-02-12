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
import { injectDependencies } from "../src/testUtils/dependencies.js";
import { injectTestDependencies } from "./helpers/dependencies.js";
import { Pool as MockPool } from "../src/db/__mocks__/pg.js";

jest.unstable_mockModule(
  "../src/logger/index",
  () => import("../src/logger/__mocks__/index.js")
);
jest.unstable_mockModule("../src/env", () => import("../src/__mocks__/env.js"));
jest.unstable_mockModule(
  "../src/analytics/amplitude/index",
  () => import("../src/analytics/amplitude/__mocks__/index.js")
);

const enableSSL = false;
const appPort = 3500;
const dbPort = appPort + 1;
const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: dbPort,
};
const testPool = new MockPool(dbConfig);

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

// Define dependencies
let converterOptions;
let converter;
let hostUrl: string;
let db;
let bot;
let telegramServer: nock.Scope;
let host: request.SuperTest<request.Test>;
let chatType;
let testMessageId = 0;
let testChatId = 0;
let tgMessage;
let mockTgReceiveUnexpectedMessage;
let sendTelegramMessage;
let mockUpdateBotStatUsage;
let mockTgReceiveRawMessage;
let mockTgGetFileUrl;
let mockSpeechRecognition;
let mockGetBotStatItem;
let LanguageCode;
let randomIntFromInterval;
let TelegramMessageModel;
let BotCommand;
let LabelId;
let mockTgReceiveMessages;
let telegramBotName;
let TelegramMessageMetaItem;
let mockTgReceiveMessage;
let TelegramMessageMetaType;
let officialChannelAccount;
let githubUrl;
let getLangButtons;
let sendTelegramCallbackMessage;
let mockTgReceiveCallbackMessage;
let mockUpdateBotStatLang;
let getFundButtons;
let botStat;
let BotStatRecordModel;
let testLangId;
// *EndOf Define dependencies

describe("[russian language]", () => {
  beforeAll(async () => {
    // Init dependencies
    const init = await injectDependencies();
    const initTest = await injectTestDependencies();

    mockUpdateBotStatUsage = initTest.mockUpdateBotStatUsage;
    mockGetBotStatItem = initTest.mockGetBotStatItem;
    mockTgReceiveUnexpectedMessage = initTest.mockTgReceiveUnexpectedMessage;
    sendTelegramMessage = initTest.sendTelegramMessage;
    mockTgReceiveRawMessage = initTest.mockTgReceiveRawMessage;
    mockTgGetFileUrl = initTest.mockTgGetFileUrl;
    mockSpeechRecognition = initTest.mockSpeechRecognition;
    LanguageCode = init.LanguageCode;
    randomIntFromInterval = init.randomIntFromInterval;
    TelegramMessageModel = initTest.TelegramMessageModel;
    BotCommand = init.BotCommand;
    LabelId = init.LabelId;
    mockTgReceiveMessages = initTest.mockTgReceiveMessages;
    telegramBotName = init.telegramBotName;
    TelegramMessageMetaItem = initTest.TelegramMessageMetaItem;
    mockTgReceiveMessage = initTest.mockTgReceiveMessage;
    TelegramMessageMetaType = initTest.TelegramMessageMetaType;
    officialChannelAccount = init.officialChannelAccount;
    githubUrl = init.githubUrl;
    getLangButtons = initTest.getLangButtons;
    sendTelegramCallbackMessage = initTest.sendTelegramCallbackMessage;
    mockTgReceiveCallbackMessage = initTest.mockTgReceiveCallbackMessage;
    mockUpdateBotStatLang = initTest.mockUpdateBotStatLang;
    getFundButtons = initTest.getFundButtons;
    BotStatRecordModel = initTest.BotStatRecordModel;
    testLangId = init.LanguageCode.Ru;

    const mockGoogleAuth = initTest.mockGoogleAuth;
    const TelegramBotModel = init.TelegramBotModel;
    const mockTgGetWebHook = initTest.mockTgGetWebHook;
    const mockTgSetWebHook = initTest.mockTgSetWebHook;
    const mockTgSetCommands = initTest.mockTgSetCommands;
    const getMockCertificate = initTest.getMockCertificate;
    const getVoiceConverterInstance = init.getVoiceConverterInstance;
    const getVoiceConverterProvider = init.getVoiceConverterProvider;
    const ExpressServer = init.ExpressServer;
    const appVersion = init.appVersion;
    const httpsOptions = init.httpsOptions;
    const NodesSql = init.NodesSql;
    const UsagesSql = init.UsagesSql;
    const DonationsSql = init.DonationsSql;
    const UsedEmailsSql = init.UsedEmailsSql;
    const TelegramApi = init.TelegramApi;
    const localhostUrl = init.localhostUrl;
    const launchTime = init.launchTime;
    const DbClient = init.DbClient;

    mockGoogleAuth();
    converterOptions = {
      isTestEnv: true,
      googlePrivateKey: getMockCertificate(),
      googleProjectId: "some-project",
      googleClientEmail: "some-email",
    };
    converter = getVoiceConverterInstance(
      getVoiceConverterProvider("GOOGLE"),
      converterOptions
    );
    hostUrl = `${localhostUrl}:${appPort}`;
    db = new DbClient(dbConfig, 0, testPool);
    bot = new TelegramBotModel("telegram-api-token", converter, db);
    bot.setHostLocation(hostUrl, launchTime);
    telegramServer = nock(TelegramApi.url);
    host = request(hostUrl);
    chatType = "group";
    tgMessage = new TelegramMessageModel(testChatId, chatType);
    // *EndOf Init dependencies

    mockTgGetWebHook(telegramServer, "https://unknown.url");
    mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
    mockTgSetCommands(telegramServer);

    const server = new ExpressServer(
      appPort,
      enableSSL,
      appVersion,
      httpsOptions
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
    chatType = "channel";
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
          [
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.OfficialChannel,
                officialChannelAccount
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.GithubIssues,
                githubUrl
              ),
            ],
          ]
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
          [
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.OfficialChannel,
                officialChannelAccount
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.GithubIssues,
                githubUrl
              ),
            ],
          ]
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
          [
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.OfficialChannel,
                officialChannelAccount
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.ContactAuthor,
                authorUrl
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.GithubIssues,
                githubUrl
              ),
            ],
          ]
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
          [
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.OfficialChannel,
                officialChannelAccount
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.ContactAuthor,
                authorUrl
              ),
            ],
            [
              new TelegramMessageMetaItem(
                TelegramMessageMetaType.Link,
                LabelId.GithubIssues,
                githubUrl
              ),
            ],
          ]
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
          getLangButtons()
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
          getLangButtons()
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
          getLangButtons()
        ),
      ]).then(([, prefixId]) => {
        const cbMessage = new TelegramMessageModel(testChatId, chatType);
        const newLangId = LanguageCode.Ru;
        cbMessage.setLangCallback(tgMessage.messageId + 1, newLangId, prefixId);
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
          getLangButtons()
        ),
      ]).then(([, prefixId]) => {
        const cbMessage = new TelegramMessageModel(testChatId, chatType);
        const newLangId = LanguageCode.En;
        cbMessage.setLangCallback(tgMessage.messageId + 1, newLangId, prefixId);
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
          getFundButtons()
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
          getFundButtons()
        ),
      ]);
    });

    it("converts voice into text (it fits 90 sec limit) - no username", () => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 89;
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

    it("converts voice into text (it fits 90 sec limit) - has username", () => {
      const voiceFileId = "some-file-id-new";
      const voiceFileDuration = randomIntFromInterval(1, 89);
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

    it("converts voice into text (it fits 90 sec limit) - has first name", () => {
      const voiceFileId = "some-file-id-new";
      const voiceFileDuration = randomIntFromInterval(1, 89);
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

    it("converts voice into text (it fits 90 sec limit) - has last name", () => {
      const voiceFileId = "some-file-id-new";
      const voiceFileDuration = randomIntFromInterval(1, 89);
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

    it("converts voice into text (it fits 90 sec limit) - has both first and last name", () => {
      const voiceFileId = "some-file-id-new";
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

    it("keeps calm on a big voice files more than 90 sec", (done) => {
      const voiceFileId = "some-file-id";
      const voiceFileDuration = 90;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      mockTgReceiveUnexpectedMessage(telegramServer, done);

      sendTelegramMessage(host, bot, tgMessage).then(() => {
        expect(nock.pendingMocks()).toHaveLength(1);
        nock.cleanAll();
        return done && done();
      });
    });

    it("keeps calm if the message is from another bot", (done) => {
      tgMessage.setName(testMessageId, {}, true);
      mockTgReceiveUnexpectedMessage(telegramServer, done);

      sendTelegramMessage(host, bot, tgMessage).then(() => {
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

      sendTelegramMessage(host, bot, tgMessage).then(() => {
        expect(nock.pendingMocks()).toHaveLength(1);
        nock.cleanAll();
        return done && done();
      });
    });

    it("keeps calm on a voice file with broken duration", (done) => {
      const voiceFileId = "some-file-id";
      tgMessage.setVoice(testMessageId, voiceFileId, -53);

      mockTgReceiveUnexpectedMessage(telegramServer, done);

      sendTelegramMessage(host, bot, tgMessage).then(() => {
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

      sendTelegramMessage(host, bot, tgMessage).then(() => {
        expect(nock.pendingMocks()).toHaveLength(1);
        nock.cleanAll();
        return done && done();
      });
    });

    it("keeps calm on an audio file with broken duration", (done) => {
      const voiceFileId = "some-file-id";
      tgMessage.setAudio(testMessageId, voiceFileId, -123);

      mockTgReceiveUnexpectedMessage(telegramServer, done);

      sendTelegramMessage(host, bot, tgMessage).then(() => {
        expect(nock.pendingMocks()).toHaveLength(1);
        nock.cleanAll();
        return done && done();
      });
    });

    it("converts audio into text (it fits 90 sec limit) - has both first and last name", () => {
      const voiceFileId = "some-file-id-new";
      const voiceFileDuration = randomIntFromInterval(1, 89);
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
