import { vi, expect, afterEach, it, describe, beforeAll, afterAll } from "vitest";
import request from "supertest";
import nock from "nock";
import { Pool as MockPool } from "../src/db/__mocks__/pg.js";
import { TelegramBotModel } from "../src/telegram/bot.js";
import { getVoiceConverterInstances } from "../src/recognition/index.js";
import { localhostUrl } from "../src/const.js";
import { DbClient } from "../src/db/client.js";
import { getDb } from "../src/db/index.js";
import { appVersion, launchTime } from "../src/env.js";
import { TelegramBaseApi } from "../src/telegram/api/groups/core.js";
import { BotServer } from "../src/server/bot-server.js";
import type { VoidPromise } from "../src/common/types.js";
import { mockGoogleAuth } from "./requests/google.js";
import { getConverterOptions } from "./helpers.js";
import { mockTgGetWebHook, mockTgSetCommands, mockTgSetWebHook } from "./requests/telegram.js";

vi.mock("../src/logger/index");
vi.mock("../src/env");
vi.mock("../src/analytics/amplitude/index");
vi.mock("../src/telegram/api/tgMTProtoApi");

const appPort = 3600;
const dbPort = appPort + 1;
const webhookDoNotWait = false;

let stopHandler: VoidPromise = () => Promise.reject(new Error("Server did not start"));

let testPool: MockPool;
let telegramServer: nock.Scope;
let host: request.Agent;
let bot: TelegramBotModel;

describe("error cases", () => {
  describe("server routes", () => {
    beforeAll(async () => {
      mockGoogleAuth();

      const converters = await getVoiceConverterInstances(
        "GOOGLE",
        "GOOGLE",
        getConverterOptions(),
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

      mockTgGetWebHook(telegramServer, "https://just.test");
      mockTgSetWebHook(telegramServer, `${hostUrl}${bot.getPath()}`);
      mockTgSetCommands(telegramServer);

      const server = new BotServer(appPort, appVersion, webhookDoNotWait);
      stopHandler = await server.setSelfUrl(hostUrl).setBots([bot]).setStat(db).start();
      await server.applyHostLocation();
    });

    afterAll(() => stopHandler());

    afterEach(() => {
      expect(telegramServer.isDone()).toBe(true);
      expect(testPool.isDone()).toBe(true);
    });

    it("picks get request for bot url, shows the text that route is enabled", async () => {
      const res = await host.get(bot.getPath()).send();
      expect(res.status).toEqual(200);
      expect(res.text).toEqual("Route is enabled");
    });

    it("picks get request for bot url with old routeId, shows the text that route is enabled but stale", async () => {
      const res = await host.get(bot.getPath("cachedId")).send();
      expect(res.status).toEqual(200);
      expect(res.text).toEqual("Route is enabled under new routeId");
    });

    it("picks any other get request, shows the route not found", async () => {
      const anyGetRoute = "/some/route";
      expect(anyGetRoute).not.toBe(bot.getPath());
      const res = await host.get(anyGetRoute).send();

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
      expect(res.body.message).toBe("Route not found");
      expect(res.body.status).toBe(404);
    });

    it("picks any other post request, shows the route not found", async () => {
      const anyPostRoute = "/another/route";
      expect(anyPostRoute).not.toBe(bot.getPath());
      const res = await host.post(anyPostRoute).send();

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
      expect(res.body.message).toBe("Route not found");
      expect(res.body.status).toBe(404);
    });
  });
});
