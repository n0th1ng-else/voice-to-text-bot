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

const appPort = 3100;
const dbPort = appPort + 1;
const webhookDoNotWait = false;

let stopHandler: VoidPromise = () =>
  Promise.reject(new Error("Server did not start"));

let chatType: TgChatType;
let testMessageId = asMessageId__test(0);
let testChatId = asChatId__test(0);
let tgMessage: InstanceType<InjectedTestFn["TelegramMessageModel"]>;
let bot: TelegramBotModel;
let telegramServer: nock.Scope;
let TelegramMessageModel: InjectedTestFn["TelegramMessageModel"];
let testPool: MockPool;
let randomIntFromInterval: InjectedFn["randomIntFromInterval"];
let mockGetBotStatItem: InjectedTestFn["mockGetBotStatItem"];
let host: request.Agent;
let TranslationKeys: InjectedFn["TranslationKeys"];
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
let mockUpdateBotStatUsage: InjectedTestFn["mockUpdateBotStatUsage"];
let mockGetIgnoredChatsRow: InjectedTestFn["mockGetIgnoredChatsRow"];
let trackNotMatchedRoutes: ReturnType<InjectedTestFn["trackNotMatchedRoutes"]>;

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
    TranslationKeys = init.TranslationKeys;
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
    const BotServer = init.BotServer;
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
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            [
              TranslationKeys.LongVoiceMessage,
              {
                duration: "1 min 30 sec",
              },
            ],
          ],
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
      ]);
    });

    it("responds on a voice message with wrong mime type", () => {
      const voiceFileId = asFileId__test("some-file-id");
      const voiceFileDuration = 20;
      tgMessage.setVoice(
        testMessageId,
        voiceFileId,
        voiceFileDuration,
        "broken/type",
      );
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
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
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            [
              TranslationKeys.LongVoiceMessage,
              {
                duration: "1 min 30 sec",
              },
            ],
          ],
        ),
        sendTelegramMessage(host, bot, tgMessage),
        mockGetIgnoredChatsRow(testPool, tgMessage.chatId, false),
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
      const statModel = mockGetBotStatItem(testPool, tgMessage.chatId, "en-US");

      return Promise.all([
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
        mockTgReceiveMessages(
          telegramServer,
          tgMessage.chatId,
          statModel.langId,
          [
            [
              TranslationKeys.LongVoiceMessage,
              {
                duration: "1 min 30 sec",
              },
            ],
          ],
        ),
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
