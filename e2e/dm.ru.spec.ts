import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import nock from "nock";
import {
  injectDependencies,
  type InjectedFn,
} from "../src/testUtils/dependencies.js";
import {
  type InjectedTestFn,
  injectTestDependencies,
} from "./helpers/dependencies.js";
import { mockTableCreation, Pool as MockPool } from "../src/db/__mocks__/pg.js";
import { setCurrentMockFileId } from "../src/telegram/api/__mocks__/tgMTProtoApi.js";
import { getSupportedAudioFormats } from "../src/text/utils.js";
import type { TgChatType } from "../src/telegram/api/groups/chats/chats-types.js";
import type { LanguageCode } from "../src/recognition/types.js";
import type { VoidPromise } from "../src/common/types.js";
import {
  asChatId__test,
  asMessageId__test,
  asFileId__test,
} from "../src/testUtils/types.js";
import type { TelegramBotModel } from "../src/telegram/bot.js";

vi.mock("../src/logger/index");
vi.mock("../src/env");
vi.mock("../src/analytics/amplitude/index");
vi.mock("../src/analytics/ga/index");
vi.mock("../src/telegram/api/tgMTProtoApi");

const appPort = 3200;
const dbPort = appPort + 1;
const webhookDoNotWait = false;

let stopHandler: VoidPromise = () =>
  Promise.reject(new Error("Server did not start"));

let testLangId: LanguageCode;
let chatType: TgChatType;
let testMessageId = asMessageId__test(0);
let testChatId = asChatId__test(0);
let tgMessage: InstanceType<InjectedTestFn["TelegramMessageModel"]>;
let botStat: InstanceType<InjectedTestFn["BotStatRecordModel"]>;
let bot: TelegramBotModel;
let telegramServer: nock.Scope;
let host: request.Agent;
let randomIntFromInterval: InjectedFn["randomIntFromInterval"];
let testPool: MockPool;
let TelegramMessageModel: InjectedTestFn["TelegramMessageModel"];
let BotStatRecordModel: InjectedTestFn["BotStatRecordModel"];
let mockGetBotStatItem: InjectedTestFn["mockGetBotStatItem"];
let sendTelegramMessage: InjectedTestFn["sendTelegramMessage"];
let mockTgReceiveMessage: InjectedTestFn["mockTgReceiveMessage"];
let TranslationKeys: InjectedFn["TranslationKeys"];
let BotCommand: InjectedFn["BotCommand"];
let mockTgReceiveMessages: InjectedTestFn["mockTgReceiveMessages"];
let TelegramMessageMetaItem: InjectedTestFn["TelegramMessageMetaItem"];
let TelegramMessageMetaType: InjectedTestFn["TelegramMessageMetaType"];
let sendTelegramCallbackMessage: InjectedTestFn["sendTelegramCallbackMessage"];
let officialChannelAccount: InjectedFn["officialChannelAccount"];
let githubUrl: InjectedFn["githubUrl"];
let getLangButtons: InjectedTestFn["getLangButtons"];
let mockTgReceiveCallbackMessage: InjectedTestFn["mockTgReceiveCallbackMessage"];
let mockUpdateBotStatLang: InjectedTestFn["mockUpdateBotStatLang"];
let mockSpeechRecognition: InjectedTestFn["mockSpeechRecognition"];
let getDonateButtons: InjectedTestFn["getDonateButtons"];
let mockTgReceiveRawMessage: InjectedTestFn["mockTgReceiveRawMessage"];
let mockUpdateBotStatUsage: InjectedTestFn["mockUpdateBotStatUsage"];
let mockGetIgnoredChatsRow: InjectedTestFn["mockGetIgnoredChatsRow"];
let trackNotMatchedRoutes: ReturnType<InjectedTestFn["trackNotMatchedRoutes"]>;

describe("[russian language]", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    const initTest = await injectTestDependencies();

    randomIntFromInterval = init.randomIntFromInterval;
    TelegramMessageModel = initTest.TelegramMessageModel;
    BotCommand = init.BotCommand;
    mockGetBotStatItem = initTest.mockGetBotStatItem;
    sendTelegramMessage = initTest.sendTelegramMessage;
    mockTgReceiveMessage = initTest.mockTgReceiveMessage;
    TranslationKeys = init.TranslationKeys;
    sendTelegramCallbackMessage = initTest.sendTelegramCallbackMessage;
    BotStatRecordModel = initTest.BotStatRecordModel;
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
    mockUpdateBotStatUsage = initTest.mockUpdateBotStatUsage;
    mockGetIgnoredChatsRow = initTest.mockGetIgnoredChatsRow;

    trackNotMatchedRoutes = initTest.trackNotMatchedRoutes();
    const mockGoogleAuth = initTest.mockGoogleAuth;
    const getVoiceConverterInstances = init.getVoiceConverterInstances;
    const DbClient = init.DbClient;
    const getDb = init.getDb;
    const localhostUrl = init.localhostUrl;
    const TelegramBotModel = init.TelegramBotModel;
    const TelegramBaseApi = init.TelegramBaseApi;
    const mockTgGetWebHook = initTest.mockTgGetWebHook;
    const mockTgSetWebHook = initTest.mockTgSetWebHook;
    const mockTgSetCommands = initTest.mockTgSetCommands;
    const BotServer = init.BotServerNew;
    const appVersion = init.appVersion;
    const launchTime = init.launchTime;

    mockGoogleAuth();

    const converters = await getVoiceConverterInstances(
      "GOOGLE",
      "GOOGLE",
      initTest.getConverterOptions(),
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
    mockTableCreation(testPool);

    const mainDb = new DbClient(dbConfig, 0, testPool);
    const db = getDb([dbConfig], 0, mainDb);

    bot = await TelegramBotModel.factory(
      "telegram-api-token",
      92345555,
      "telegram-app-hash",
      converters,
      db,
    );
    bot.setHostLocation(hostUrl, launchTime);

    telegramServer = nock(TelegramBaseApi.url);
    host = request(hostUrl);

    testLangId = "ru-RU";
    chatType = "private";
    tgMessage = new TelegramMessageModel(testChatId, chatType);
    botStat = new BotStatRecordModel(tgMessage.chatId, testLangId);

    mockTgGetWebHook(telegramServer, "https://unknown.url");
    mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
    mockTgSetCommands(telegramServer);

    const server = new BotServer(appPort, appVersion, webhookDoNotWait);

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
    testMessageId = asMessageId__test(randomIntFromInterval(1, 100000));
    testChatId = asChatId__test(randomIntFromInterval(1, 100000));
  });

  afterEach(() => {
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
    expect(trackNotMatchedRoutes()).toBe(true);
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
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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

    it("detects user language from the message (EN)", () => {
      tgMessage.setText(testMessageId, "some text");
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        "en-US",
        botStat,
      );
      tgMessage.setName(asMessageId__test(123323), {}, false, "en");

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
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            TranslationKeys.WelcomeMessage,
            TranslationKeys.WelcomeMessageGroup,
            TranslationKeys.WelcomeMessageMore,
            TranslationKeys.DonateMessage,
          ],
        ),
      ]);
    });

    it("responds on a /support message", () => {
      tgMessage.setText(testMessageId, BotCommand.Support);
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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
        cbMessage.setLangCallback(
          asMessageId__test(tgMessage.messageId + 1),
          newLangId,
          prefixId,
        );
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
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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

    it("converts voice into text (it fits 90 sec limit)", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;
      const voiceFileContent = "supergroup";
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration);
      botStat.usageCount = 37;

      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            [
              TranslationKeys.LongVoiceMessage,
              {
                duration: "1 мин 30 сек",
              },
            ],
          ],
        ),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on a voice message with wrong mime type", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 20;
      tgMessage.setVoice(testMessageId, voiceFileId, voiceFileDuration, "");
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            TranslationKeys.AudioNotSupportedMessage,
            [
              TranslationKeys.SupportedFormatsMessage,
              { formats: getSupportedAudioFormats() },
            ],
            TranslationKeys.SupportedFormatsMessageExplanation,
          ],
        ),
      ]);
    });

    it("converts audio into text (it fits 90 sec limit)", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;
      const voiceFileContent = "supergroup";
      tgMessage.setAudio(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            [
              TranslationKeys.LongVoiceMessage,
              {
                duration: "1 мин 30 сек",
              },
            ],
          ],
        ),
      ]);
    });

    it("responds on an audio message with wrong mime type", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 20;
      tgMessage.setAudio(
        testMessageId,
        voiceFileId,
        voiceFileDuration,
        "broken/test",
      );
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            TranslationKeys.AudioNotSupportedMessage,
            [
              TranslationKeys.SupportedFormatsMessage,
              { formats: getSupportedAudioFormats() },
            ],
            TranslationKeys.SupportedFormatsMessageExplanation,
          ],
        ),
      ]);
    });

    it("responds on an audio message with broken duration", () => {
      const voiceFileId = asFileId__test("some-file-id");
      tgMessage.setAudio(testMessageId, voiceFileId, -41);
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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

    it("converts video_note into text (it fits 90 sec limit)", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 89;
      const voiceFileContent = "supergroup";
      tgMessage.setVideoNote(testMessageId, voiceFileId, voiceFileDuration);

      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

      return Promise.all([
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            [
              TranslationKeys.LongVoiceMessage,
              {
                duration: "1 мин 30 сек",
              },
            ],
          ],
        ),
      ]);
    });

    it("responds on an video_note message with broken duration", () => {
      const voiceFileId = asFileId__test("some-file-id");
      tgMessage.setVideoNote(testMessageId, voiceFileId, -41);
      const statModel = mockGetBotStatItem(
        testPool,
        tgMessage.chatId,
        botStat.langId,
        botStat,
      );

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
  });
});
