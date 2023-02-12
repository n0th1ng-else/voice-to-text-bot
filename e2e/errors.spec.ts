import {
  jest,
  expect,
  afterEach,
  it,
  describe,
  beforeAll,
  afterAll,
} from "@jest/globals";
import request from "supertest";
import nock from "nock";
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
const appPort = 3600;
const dbPort = appPort + 1;

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

let testPool;
let telegramServer;
let host;
let bot;

describe("error cases", () => {
  describe("server routes", () => {
    beforeAll(async () => {
      const init = await injectDependencies();
      const initTest = await injectTestDependencies();

      const mockGoogleAuth = initTest.mockGoogleAuth;
      const getMockCertificate = initTest.getMockCertificate;
      const getVoiceConverterInstance = init.getVoiceConverterInstance;
      const getVoiceConverterProvider = init.getVoiceConverterProvider;
      const DbClient = init.DbClient;
      const localhostUrl = init.localhostUrl;
      const TelegramBotModel = init.TelegramBotModel;
      const TelegramApi = init.TelegramApi;
      const mockTgGetWebHook = initTest.mockTgGetWebHook;
      const mockTgSetWebHook = initTest.mockTgSetWebHook;
      const mockTgSetCommands = initTest.mockTgSetCommands;
      const ExpressServer = init.ExpressServer;
      const appVersion = init.appVersion;
      const httpsOptions = init.httpsOptions;
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
        converterOptions
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
      const db = new DbClient(dbConfig, 0, testPool);

      bot = new TelegramBotModel("telegram-api-token", converter, db);
      bot.setHostLocation(hostUrl, launchTime);

      telegramServer = nock(TelegramApi.url);
      host = request(hostUrl);

      mockTgGetWebHook(telegramServer, "https://just.test");
      mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
      mockTgSetCommands(telegramServer);

      const server = new ExpressServer(
        appPort,
        enableSSL,
        appVersion,
        httpsOptions
      );
      return server
        .setSelfUrl(hostUrl)
        .setBots([bot])
        .setStat(db)
        .start()
        .then((stopFn) => {
          stopHandler = stopFn;
          return server.applyHostLocation();
        });
    });

    afterAll(() => stopHandler());

    afterEach(() => {
      expect(telegramServer.isDone()).toBe(true);
      expect(testPool.isDone()).toBe(true);
    });

    it("picks get request for bot url, shows not found, ", () => {
      return host
        .get(bot.getPath())
        .send()
        .then((res) => {
          expect(res.status).toBe(404);
          expect(res.body.error).toBe("Not found");
          expect(res.body.message).toBe("Route not found");
          expect(res.body.status).toBe(404);
          // TODO check in the logs
        });
    });

    it("picks any get request, shows not found", () => {
      const anyGetRoute = "/some/route";
      expect(anyGetRoute).not.toBe(bot.getPath());
      return host
        .get(anyGetRoute)
        .send()
        .then((res) => {
          expect(res.status).toBe(404);
          expect(res.body.error).toBe("Not found");
          expect(res.body.message).toBe("Route not found");
          expect(res.body.status).toBe(404);
        });
    });

    it("picks any get request, shows not found", () => {
      const anyPostRoute = "/another/route";
      expect(anyPostRoute).not.toBe(bot.getPath());
      return host
        .post(anyPostRoute)
        .send()
        .then((res) => {
          expect(res.status).toBe(404);
          expect(res.body.error).toBe("Not found");
          expect(res.body.message).toBe("Route not found");
          expect(res.body.status).toBe(404);
        });
    });
  });
});
