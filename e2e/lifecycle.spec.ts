import request from "supertest";
import {
  expect,
  jest,
  beforeEach,
  afterEach,
  it,
  describe,
} from "@jest/globals";
import { ExpressServer } from "../src/server/express.js";
import { HealthSsl, HealthStatus } from "../src/server/types.js";
import { appVersion, launchTime } from "../src/env.js";
import { localhostUrl } from "../src/const.js";
import { TelegramBotModel } from "../src/telegram/bot.js";
import { mockGoogleAuth } from "./requests/google.js";
import {
  VoiceConverterOptions,
  VoiceConverterProvider,
} from "../src/recognition/types.js";
import { getMockCertificate } from "./helpers.js";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../src/recognition/index.js";
import {
  mockTgGetWebHook,
  mockTgGetWebHookError,
} from "./requests/telegram.js";
import nock from "nock";
import { TelegramApi } from "../src/telegram/api/index.js";
import { httpsOptions } from "../certs/index.js";
import { Pool as MockPool } from "../src/db/__mocks__/pg.js";
import { DbClient } from "../src/db/index.js";

jest.mock("../src/logger");
jest.mock("../src/env.js");
jest.mock("../src/analytics/amplitude", () => ({
  collectEvents: () => Promise.resolve(),
}));

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

const appPort = 3800;
const dbPort = appPort + 1;

const hostUrl = `${localhostUrl}:${appPort}`;

const enableSSL = false;

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: dbPort,
};
const testPool = new MockPool(dbConfig);
const db = new DbClient(dbConfig, testPool);

const bot = new TelegramBotModel("telegram-api-token", converter, db);
bot.setHostLocation(hostUrl, launchTime);

const telegramServer = nock(TelegramApi.url);
const host = request(`${localhostUrl}:${appPort}`);
const path = "/lifecycle";

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

jest.mock("../src/logger");
jest.mock("../src/env.js");

let server: ExpressServer;

describe("[lifecycle]", () => {
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
