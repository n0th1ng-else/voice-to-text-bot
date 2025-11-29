import { expect, vi, beforeEach, afterEach, it, describe, beforeAll } from "vitest";
import request from "supertest";
import nock from "nock";
import { Pool as MockPool } from "../src/db/__mocks__/pg.js";
import { injectDependencies, type InjectedFn } from "../src/testUtils/dependencies.js";
import { injectTestDependencies, type InjectedTestFn } from "./helpers/dependencies.js";
import { HealthSsl, HealthStatus } from "../src/server/types.js";
import type { VoidPromise } from "../src/common/types.js";
import type { TelegramBotModel } from "../src/telegram/bot.js";

vi.mock("../src/logger/index");
vi.mock("../src/env");
vi.mock("../src/analytics/amplitude/index");
vi.mock("../src/telegram/api/tgMTProtoApi");

const appPort = 3800;
const dbPort = appPort + 1;
const webhookDoNotWait = false;

const path = "/lifecycle";

let stopHandler: VoidPromise = () => Promise.reject(new Error("Server did not start"));

let server: InstanceType<InjectedFn["BotServer"]>;
let localhostUrl: string;
let BotServer: InjectedFn["BotServer"];
let appVersion: InjectedFn["appVersion"];
let telegramServer: nock.Scope;
let testPool: MockPool;
let host: request.Agent;
let mockTgGetWebHook: InjectedTestFn["mockTgGetWebHook"];
let hostUrl: string;
let bot: TelegramBotModel;
let mockTgGetWebHookError: InjectedTestFn["mockTgGetWebHookError"];

describe("[lifecycle]", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    const initTest = await injectTestDependencies();

    BotServer = init.BotServer;
    appVersion = init.appVersion;
    mockTgGetWebHook = initTest.mockTgGetWebHook;
    mockTgGetWebHookError = initTest.mockTgGetWebHookError;
    localhostUrl = init.localhostUrl;

    const mockGoogleAuth = initTest.mockGoogleAuth;
    const getVoiceConverterInstances = init.getVoiceConverterInstances;
    const DbClient = init.DbClient;
    const getDb = init.getDb;
    const TelegramBotModel = init.TelegramBotModel;
    const launchTime = init.launchTime;
    const TelegramBaseApi = init.TelegramBaseApi;

    mockGoogleAuth();

    const converters = await getVoiceConverterInstances(
      "GOOGLE",
      "GOOGLE",
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
    host = request(`${localhostUrl}:${appPort}`);
  });

  afterEach(async () => {
    await stopHandler();
    expect(telegramServer.isDone()).toBe(true);
    expect(testPool.isDone()).toBe(true);
  });

  describe("starts with NO bots", () => {
    beforeEach(async () => {
      server = new BotServer(appPort, appVersion, webhookDoNotWait);
      stopHandler = await server.start();
    });

    it("initial api access", () => {
      return host.post(path).then((res) => {
        expect(res.status).toBe(400);
        expect(res.body.ssl).toBe(HealthSsl.Off);
        expect(res.body.status).toBe(HealthStatus.InProgress);
        expect(res.body.urls).toEqual([]);
        expect(res.body.version).toBe(appVersion);
        expect(res.body.message).toBe("App is not connected to the Telegram server");
      });
    });

    it("starts with no bots enabled", () => {
      return server
        .setBots()
        .applyHostLocation()
        .then(() => host.post(path))
        .then((res) => {
          expect(res.status).toBe(200);
          expect(res.body.ssl).toBe(HealthSsl.Off);
          expect(res.body.status).toBe(HealthStatus.Online);
          expect(res.body.urls).toEqual([]);
          expect(res.body.version).toBe(appVersion);
        });
    });
  });

  describe("starts with bots", () => {
    beforeEach(async () => {
      mockTgGetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);

      server = new BotServer(appPort, appVersion, webhookDoNotWait);
      server.setBots([bot]);
      await server.applyHostLocation();
      stopHandler = await server.start();
    });

    it("shows okay health check", () => {
      mockTgGetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
      return host.post(path).then((res) => {
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
      return host.post(path).then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.ssl).toBe(HealthSsl.Off);
        expect(res.body.status).toBe(HealthStatus.Online);
        expect(res.body.urls).toEqual([`${nextUrl}${bot.getPath()}`]);
        expect(res.body.version).toBe(appVersion);
      });
    });

    it("shows error health check", () => {
      mockTgGetWebHookError(telegramServer);
      return host.post(path).then((res) => {
        expect(res.status).toBe(400);
        expect(res.body.ssl).toBe(HealthSsl.Off);
        expect(res.body.status).toBe(HealthStatus.Error);
        expect(res.body.urls).toEqual([]);
        expect(res.body.version).toBe(appVersion);
      });
    });
  });
});
