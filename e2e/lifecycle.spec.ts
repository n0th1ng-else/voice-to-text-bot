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
import { injectDependencies } from "../src/testUtils/dependencies.js";
import { injectTestDependencies } from "./helpers/dependencies.js";
import { HealthSsl, HealthStatus } from "../src/server/types.js";

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
const appPort = 3800;
const dbPort = appPort + 1;

const path = "/lifecycle";

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

let server;
let localhostUrl;
let ExpressServer;
let appVersion;
let httpsOptions;
let telegramServer;
let testPool;
let host;
let mockTgGetWebHook;
let hostUrl;
let bot;
let mockTgGetWebHookError;

describe("[lifecycle]", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    const initTest = await injectTestDependencies();

    ExpressServer = init.ExpressServer;
    appVersion = init.appVersion;
    httpsOptions = init.httpsOptions;
    mockTgGetWebHook = initTest.mockTgGetWebHook;
    mockTgGetWebHookError = initTest.mockTgGetWebHookError;
    localhostUrl = init.localhostUrl;

    const mockGoogleAuth = initTest.mockGoogleAuth;
    const getMockCertificate = initTest.getMockCertificate;
    const getVoiceConverterInstance = init.getVoiceConverterInstance;
    const getVoiceConverterProvider = init.getVoiceConverterProvider;
    const DbClient = init.DbClient;
    const TelegramBotModel = init.TelegramBotModel;
    const launchTime = init.launchTime;
    const TelegramApi = init.TelegramApi;

    mockGoogleAuth();

    const converterOptions = {
      isTestEnv: true,
      googlePrivateKey: getMockCertificate(),
      googleProjectId: "some-project",
      googleClientEmail: "some-email",
    };

    const converter = getVoiceConverterInstance(
      getVoiceConverterProvider("GOOGLE"),
      converterOptions
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
    const db = new DbClient(dbConfig, 0, testPool);

    bot = new TelegramBotModel("telegram-api-token", converter, db);
    bot.setHostLocation(hostUrl, launchTime);

    telegramServer = nock(TelegramApi.url);
    host = request(`${localhostUrl}:${appPort}`);
  });

  beforeEach(() => {
    server = new ExpressServer(appPort, enableSSL, appVersion, httpsOptions);
    return server.start().then((stopFn) => (stopHandler = stopFn));
  });

  afterEach(() => {
    return stopHandler().then(() => {
      expect(telegramServer.isDone()).toBe(true);
      expect(testPool.isDone()).toBe(true);
    });
  });

  it("initial api access", () => {
    return host.post(path).then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.ssl).toBe(HealthSsl.Off);
      expect(res.body.status).toBe(HealthStatus.InProgress);
      expect(res.body.urls).toEqual([]);
      expect(res.body.version).toBe(appVersion);
      expect(res.body.message).toBe(
        "App is not connected to the Telegram server"
      );
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

  describe("starts with bots", () => {
    beforeEach(() => {
      mockTgGetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);

      return server.setBots([bot]).applyHostLocation();
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
