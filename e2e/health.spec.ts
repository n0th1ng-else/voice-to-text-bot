import request from "supertest";
import {
  expect,
  jest,
  beforeEach,
  afterEach,
  it,
  describe,
} from "@jest/globals";
import { ExpressServer } from "../src/server/express";
import { HealthSsl, HealthStatus } from "../src/server/types";
import { appVersion } from "../src/env";
import { localhostUrl, telegramUrl } from "../src/const";
import { TelegramBotModel } from "../src/telegram/bot";
import { StatisticApi } from "../src/statistic";
import { mockGoogleAuth } from "./requests/google";
import {
  VoiceConverterOptions,
  VoiceConverterProvider,
} from "../src/recognition/types";
import { getMockCertificate } from "./helpers";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../src/recognition";
import {
  mockTgGetWebHook,
  mockTgGetWebHookError,
  mockTgSetCommands,
  mockTgSetWebHook,
} from "./requests/telegram";
import nock from "nock";

jest.mock("../src/logger");
jest.mock("../src/env");

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

const appPort = 3300;
const dbPort = appPort + 1;

const hostUrl = `${localhostUrl}:${appPort}`;
const dbUrl = `${localhostUrl}:${dbPort}`;

const enableSSL = false;

const stat = new StatisticApi(dbUrl, "db-app", "db-key", "db-master", 0);

const bot = new TelegramBotModel("telegram-api-token", converter, stat);
bot.setHostLocation(hostUrl);

const telegramServer = nock(telegramUrl);
const host = request(`${localhostUrl}:${appPort}`);
const path = "/health";

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

jest.mock("../src/logger");

let server: ExpressServer;

describe("[health]", () => {
  beforeEach(() => {
    server = new ExpressServer(appPort, enableSSL, appVersion);
    return server.start().then((stopFn) => (stopHandler = stopFn));
  });

  afterEach(() => {
    return stopHandler().then(() => {
      expect(telegramServer.isDone()).toBeTruthy();
    });
  });

  it("initial api access", () => {
    return host.get(path).then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.ssl).toBe(HealthSsl.Off);
      expect(res.body.status).toBe(HealthStatus.InProgress);
      expect(res.body.urls).toEqual([]);
      expect(res.body.version).toBe(appVersion);
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
