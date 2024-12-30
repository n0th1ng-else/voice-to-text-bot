import {
  jest,
  expect,
  afterEach,
  it,
  describe,
  beforeEach,
} from "@jest/globals";
import request from "supertest";
import nock from "nock";
import {
  injectDependencies,
  type InjectedFn,
} from "../src/testUtils/dependencies.js";
import {
  injectTestDependencies,
  type InjectedTestFn,
} from "./helpers/dependencies.js";
import { Pool as MockPool } from "../src/db/__mocks__/pg.js";
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

const appPort = 3600;
const dbPort = appPort + 1;
const webhookDoNotWait = false;

const path = "/health";

let stopHandler: VoidPromise = () =>
  Promise.reject(new Error("Server did not start"));

let testPool: MockPool;
let telegramServer: nock.Scope;
let host: request.Agent;
let bot: InstanceType<InjectedFn["TelegramBotModel"]>;
let mockTgGetWebHook: InjectedTestFn["mockTgGetWebHook"];
let hostUrl: string;

describe("[health]", () => {
  describe("starts with bots", () => {
    beforeEach(async () => {
      const init = await injectDependencies();
      const initTest = await injectTestDependencies();

      const mockGoogleAuth = initTest.mockGoogleAuth;
      const getVoiceConverterInstance = init.getVoiceConverterInstance;
      const getVoiceConverterProvider = init.getVoiceConverterProvider;
      const DbClient = init.DbClient;
      const getDb = init.getDb;
      const localhostUrl = init.localhostUrl;
      const TelegramBotModel = init.TelegramBotModel;
      const TelegramApi = init.TelegramApi;
      mockTgGetWebHook = initTest.mockTgGetWebHook;
      const mockTgSetWebHook = initTest.mockTgSetWebHook;
      const mockTgSetCommands = initTest.mockTgSetCommands;
      const BotServer = init.BotServerNew;
      const appVersion = init.appVersion;
      const launchTime = init.launchTime;

      mockGoogleAuth();

      const converter = await getVoiceConverterInstance(
        getVoiceConverterProvider("GOOGLE"),
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
      const mainDb = new DbClient(dbConfig, 0, testPool);
      const db = getDb([dbConfig], 0, mainDb);

      bot = new TelegramBotModel("telegram-api-token", converter, db);
      bot.setHostLocation(hostUrl, launchTime);

      telegramServer = nock(TelegramApi.url);
      host = request(hostUrl);

      mockTgGetWebHook(telegramServer, "https://just.test");
      mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
      mockTgSetCommands(telegramServer);

      const server = new BotServer(appPort, appVersion, webhookDoNotWait);
      stopHandler = await server
        .setSelfUrl(hostUrl)
        .setBots([bot])
        .setStat(db)
        .start();
      await server.applyHostLocation();
    });

    afterEach(async () => {
      await stopHandler();
      expect(telegramServer.isDone()).toBe(true);
      expect(testPool.isDone()).toBe(true);
    });

    it("shows okay health check", async () => {
      mockTgGetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
      const res = await host.get(path);
      expect(res.status).toBe(200);
      // expect(res.body.ssl).toBe(HealthSsl.Off);
      // expect(res.body.status).toBe(HealthStatus.Online);
      expect(res.body.urls).toEqual([`${hostUrl}${bot.getPath()}`]);
      // expect(res.body.version).toBe(appVersion);
    });
  });
});
