import {
  expect,
  jest,
  beforeEach,
  afterEach,
  it,
  describe,
  beforeAll,
} from "@jest/globals";
import request from "supertest";
import nock from "nock";
import { Pool as MockPool } from "../src/db/__mocks__/pg.js";
import { HealthSsl, HealthStatus } from "../src/server/types.js";
import {
  injectDependencies,
  type InjectedFn,
} from "../src/testUtils/dependencies.js";
import {
  type InjectedTestFn,
  injectTestDependencies,
} from "./helpers/dependencies.js";
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

const appPort = 3300;
const dbPort = appPort + 1;
const webhookDoNotWait = false;

let hostUrl: string;
let server: InstanceType<InjectedFn["BotServer"]>;
let telegramServer: nock.Scope;
let host: request.Agent;
let BotServer: InjectedFn["BotServer"];
let appVersion: InjectedFn["appVersion"];
let testPool: MockPool;
let mockTgGetWebHook: InjectedTestFn["mockTgGetWebHook"];
let mockTgSetWebHook: InjectedTestFn["mockTgSetWebHook"];
let mockTgSetCommands: InjectedTestFn["mockTgSetCommands"];
let mockTgGetWebHookError: InjectedTestFn["mockTgGetWebHookError"];
let bot: InstanceType<InjectedFn["TelegramBotModel"]>;
let localhostUrl: string;

const path = "/health";

let stopHandler: VoidPromise = () =>
  Promise.reject(new Error("Server did not start"));

describe("[health]", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    const initTest = await injectTestDependencies();

    BotServer = init.BotServer;
    appVersion = init.appVersion;
    mockTgGetWebHook = initTest.mockTgGetWebHook;
    mockTgSetWebHook = initTest.mockTgSetWebHook;
    mockTgSetCommands = initTest.mockTgSetCommands;
    mockTgGetWebHookError = initTest.mockTgGetWebHookError;
    localhostUrl = init.localhostUrl;

    const mockGoogleAuth = initTest.mockGoogleAuth;
    const getVoiceConverterInstance = init.getVoiceConverterInstance;
    const getVoiceConverterProvider = init.getVoiceConverterProvider;
    const DbClient = init.DbClient;
    const getDb = init.getDb;
    const TelegramBotModel = init.TelegramBotModel;
    const launchTime = init.launchTime;
    const TelegramApi = init.TelegramApi;

    mockGoogleAuth();

    const converter = await getVoiceConverterInstance(
      getVoiceConverterProvider("GOOGLE"),
      initTest.getConverterOptions(),
    );
    hostUrl = `${localhostUrl}:${appPort}`;

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
    host = request(`${localhostUrl}:${appPort}`);
  });

  beforeEach(async () => {
    server = new BotServer(appPort, appVersion, webhookDoNotWait);
    stopHandler = await server.start();
  });

  afterEach(() => {
    return stopHandler().then(() => {
      expect(telegramServer.isDone()).toBe(true);
      expect(testPool.isDone()).toBe(true);
    });
  });

  it("initial api access", () => {
    return host.get(path).then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.ssl).toBe(HealthSsl.Off);
      expect(res.body.status).toBe(HealthStatus.InProgress);
      expect(res.body.urls).toEqual([]);
      expect(res.body.version).toBe(appVersion);
      expect(res.body.message).toBe(
        "App is not connected to the Telegram server",
      );
    });
  });

  it("starts with no bots enabled", () => {
    return server
      .setBots()
      .applyHostLocation()
      .then(() => host.get(path))
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.ssl).toBe(HealthSsl.Off);
        expect(res.body.status).toBe(HealthStatus.Online);
        expect(res.body.urls).toEqual([]);
        expect(res.body.version).toBe(appVersion);
      });
  });

  describe("starts with bots", () => {
    beforeEach(() => {
      mockTgGetWebHook(telegramServer, "https://another.one");
      mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
      mockTgSetCommands(telegramServer);

      return server.setBots([bot]).applyHostLocation();
    });

    it("shows okay health check", () => {
      mockTgGetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
      return host.get(path).then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.ssl).toBe(HealthSsl.Off);
        expect(res.body.status).toBe(HealthStatus.Online);
        expect(res.body.urls).toEqual([`${hostUrl}${bot.getPath()}`]);
        expect(res.body.version).toBe(appVersion);
      });
    });

    it("shows okay health check with bot web hooks not owned by this node", () => {
      const nextUrl = `${localhostUrl}-next`;
      mockTgGetWebHook(telegramServer, `${nextUrl}${bot.getPath()}`);
      return host.get(path).then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.ssl).toBe(HealthSsl.Off);
        expect(res.body.status).toBe(HealthStatus.Online);
        expect(res.body.urls).toEqual([`${nextUrl}${bot.getPath()}`]);
        expect(res.body.version).toBe(appVersion);
      });
    });

    it("shows error health check", () => {
      mockTgGetWebHookError(telegramServer);
      return host.get(path).then((res) => {
        expect(res.status).toBe(400);
        expect(res.body.ssl).toBe(HealthSsl.Off);
        expect(res.body.status).toBe(HealthStatus.Error);
        expect(res.body.urls).toEqual([]);
        expect(res.body.version).toBe(appVersion);
      });
    });
  });
});
