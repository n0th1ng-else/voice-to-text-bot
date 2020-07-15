import request from "supertest";
import nock from "nock";
import {
  jest,
  expect,
  afterEach,
  it,
  describe,
  beforeAll,
  afterAll,
} from "@jest/globals";
import { ExpressServer } from "../src/server/express";
import { appVersion } from "../src/env";
import {
  VoiceConverterOptions,
  VoiceConverterProvider,
} from "../src/recognition/types";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../src/recognition";
import { StatisticApi } from "../src/statistic";
import { TelegramBotModel } from "../src/telegram/bot";
import { localhostUrl } from "../src/const";
import { getMockCertificate } from "./helpers";
import { mockTgSetCommands, mockTgSetWebHook } from "./requests/telegram";
import { mockGoogleAuth } from "./requests/google";
import { TelegramApi } from "../src/telegram/api";

jest.mock("../src/logger");

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

const appPort = 3600;
const dbPort = appPort + 1;

const hostUrl = `${localhostUrl}:${appPort}`;
const dbUrl = `${localhostUrl}:${dbPort}`;

const enableSSL = false;

const stat = new StatisticApi(dbUrl, "db-app", "db-key", "db-master", 0);

const bot = new TelegramBotModel("telegram-api-token", converter, stat);
bot.setHostLocation(hostUrl);

const telegramServer = nock(TelegramApi.url);
const dbServer = nock(dbUrl);
const host = request(hostUrl);

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

describe("error cases", () => {
  describe("server routes", () => {
    beforeAll(() => {
      mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
      mockTgSetCommands(telegramServer);

      const server = new ExpressServer(appPort, enableSSL, appVersion);
      return server
        .setSelfUrl(hostUrl)
        .setBots([bot])
        .setStat(stat)
        .start()
        .then((stopFn) => {
          stopHandler = stopFn;
          return server.applyHostLocation();
        });
    });

    afterAll(() => stopHandler());

    afterEach(() => {
      expect(dbServer.isDone()).toBeTruthy();
      expect(telegramServer.isDone()).toBeTruthy();
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
