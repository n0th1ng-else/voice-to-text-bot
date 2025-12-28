import { vi, expect, beforeEach, afterEach, it, describe, type MockInstance } from "vitest";
import { type HealthDto, HealthSsl, HealthStatus } from "../src/server/types.js";
import type { VoidPromise } from "../src/common/types.js";
import * as apiUtils from "../src/server/api.js";
import { BotServer } from "../src/server/bot-server.js";
import { WaiterForCalls } from "../src/testUtils/waitFor.js";
import { localhostUrl } from "../src/const.js";
import { appVersion } from "../src/env.js";

vi.mock("../src/logger/index");
vi.mock("../src/env");
vi.mock("../src/analytics/amplitude/index");

const apiSpy = vi.spyOn(apiUtils, "requestHealthData");

apiSpy.mockImplementation(() => {
  const dto: HealthDto = {
    version: "new2",
    urls: [],
    status: HealthStatus.Online,
    message: "ok",
    ssl: HealthSsl.Off,
    threadId: 0,
    serverName: "MockedServer",
    runtimeVersion: "1.0.0",
    daysOnlineCurrent: 1,
    daysOnlineLimit: 1,
  };
  waiter.tick();
  return Promise.resolve(dto);
});

const appPort = 3700;
const nextUrl = `http://nexthost:${appPort + 1}`;

let realClearInterval = global.clearInterval;
let clearIntervalSpy: MockInstance;

const oneMinute = 60_000;
const oneDayMinutes = 24 * 60;

let server: BotServer;
const waiter = new WaiterForCalls();
const hostUrl = `${localhostUrl}:${appPort}`;
const webhookDoNotWait = false;

let stopHandler: VoidPromise = () => Promise.reject(new Error("Server did not start"));

describe("[uptime daemon]", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      now: new Date().setHours(23, 58, 0, 0),
      shouldAdvanceTime: true,
    });
    vi.clearAllTimers();
    realClearInterval = global.clearInterval;
    clearIntervalSpy = vi.spyOn(global, "clearInterval");

    clearIntervalSpy.mockImplementation((interval) => {
      realClearInterval(interval);
      waiter.tick();
    });

    server = new BotServer(appPort, appVersion, webhookDoNotWait);
  });

  afterEach(async () => {
    clearIntervalSpy.mockRestore();
    apiSpy.mockClear();
    vi.useRealTimers();
    await stopHandler();
  });

  describe("no selfUrl", () => {
    beforeEach(async () => {
      stopHandler = await server.start();
    });

    it("Failed to trigger the daemon if selfUrl is not set", async () => {
      const errorMessage = "Self url is not set for this node. Unable to set up the daemon";
      await expect(server.triggerDaemon("", 1)).rejects.toThrowError(errorMessage);
    });
  });

  describe("has selfUrl", () => {
    beforeEach(async () => {
      server.setSelfUrl(hostUrl);
      stopHandler = await server.start();
    });

    it("Failed to trigger the daemon if nextUrl is not set", async () => {
      const errorMessage =
        "Next instance url is not set for this node. Unable to set up the daemon";
      await expect(server.triggerDaemon("", 1)).rejects.toThrowError(errorMessage);
    });

    it("Triggers the daemon with the interval and delegates to the next node after we hit the limit", async () => {
      waiter.reset(1);
      const interval = 1;
      await Promise.all([waiter.waitForCondition(), server.triggerDaemon(nextUrl, interval)]);

      expect(vi.getTimerCount()).toBe(1);
      expect(apiSpy).toHaveBeenCalledWith(hostUrl);
      expect(apiSpy).toHaveBeenCalledTimes(1);
      apiSpy.mockClear();
      waiter.reset(1);
      vi.advanceTimersByTime(oneMinute);
      await waiter.waitForCondition();

      expect(apiSpy).toHaveBeenCalledWith(hostUrl);
      expect(apiSpy).toHaveBeenCalledTimes(1);
      apiSpy.mockClear();
      waiter.reset(3);
      vi.advanceTimersByTime(oneMinute);
      await waiter.waitForCondition();

      expect(apiSpy).toHaveBeenCalledWith(hostUrl);
      expect(apiSpy).toHaveBeenLastCalledWith(nextUrl);
      expect(apiSpy).toHaveBeenCalledTimes(2);
      apiSpy.mockClear();
      expect(clearIntervalSpy).toHaveBeenCalledWith(expect.any(Object));
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(oneDayMinutes * oneMinute);
      expect(apiSpy).not.toBeCalled();
    });

    it.each([
      ["negative", -2],
      ["zero", 0],
    ])("Triggers daemon with minimal 1 day interval if the interval is %s", async (_, interval) => {
      await server.triggerDaemon(nextUrl, interval);

      expect(vi.getTimerCount()).toBe(1);
      expect(apiSpy).toHaveBeenCalledWith(hostUrl);
      expect(apiSpy).toHaveBeenCalledTimes(1);
    });
  });
});
