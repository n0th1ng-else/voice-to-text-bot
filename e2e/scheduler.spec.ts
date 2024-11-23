import {
  jest,
  expect,
  beforeEach,
  afterEach,
  it,
  describe,
  beforeAll,
} from "@jest/globals";
import {
  injectDependencies,
  type InjectedFn,
} from "../src/testUtils/dependencies.js";
import {
  type HealthDto,
  HealthSsl,
  HealthStatus,
} from "../src/server/types.js";
import type { SpiedFunction } from "jest-mock";
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

jest.unstable_mockModule("../src/server/api.js", () => {
  return {
    requestHealthData: jest.fn(() => {
      const dto: HealthDto = {
        version: "new2",
        urls: [],
        status: HealthStatus.Online,
        message: "ok",
        ssl: HealthSsl.Off,
        threadId: 0,
        serverName: "MockedServer",
        nodeVersion: "1.0.0",
      };
      waiter.tick();
      return Promise.resolve(dto);
    }),
  };
});

const appPort = 3700;
const nextUrl = `http://nexthost:${appPort + 1}`;

let realClearInterval = global.clearInterval;
let clearIntervalSpy = jest
  .spyOn(global, "clearInterval")
  .mockImplementation((interval) => {
    realClearInterval(interval);
    waiter.tick();
  });

const oneMinute = 60_000;
const oneDayMinutes = 24 * 60;

let server: InstanceType<InjectedFn["BotServer"]>;
let requestHealthData: SpiedFunction<InjectedFn["requestHealthData"]>;
let BotServer: InjectedFn["BotServer"];
let appVersion: InjectedFn["appVersion"];
let waiter: InstanceType<InjectedFn["WaiterForCalls"]>;
let hostUrl: string;
const webhookDoNotWait = false;

let stopHandler: VoidPromise = () =>
  Promise.reject(new Error("Server did not start"));

describe("[uptime daemon]", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    requestHealthData = jest.spyOn(init, "requestHealthData");
    BotServer = init.BotServer;
    appVersion = init.appVersion;

    const localhostUrl = init.localhostUrl;
    const WaiterForCalls = init.WaiterForCalls;

    hostUrl = `${localhostUrl}:${appPort}`;
    waiter = new WaiterForCalls();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date().setHours(23, 58, 0, 0));
    realClearInterval = global.clearInterval;
    clearIntervalSpy = jest
      .spyOn(global, "clearInterval")
      .mockImplementation((interval) => {
        realClearInterval(interval);
        waiter.tick();
      });

    server = new BotServer(appPort, appVersion, webhookDoNotWait);
    return server.start().then((stopFn) => (stopHandler = stopFn));
  });

  afterEach(() => {
    clearIntervalSpy.mockClear();
    return stopHandler().finally(() => {
      jest.useRealTimers();
    });
  });

  it("Failed to trigger the daemon if selfUrl is not set", async () => {
    const errMessage =
      "Self url is not set for this node. Unable to set up the daemon";
    await expect(server.triggerDaemon("", 1)).rejects.toThrowError(errMessage);
  });

  describe("has selfUrl", () => {
    beforeEach(() => {
      server.setSelfUrl(hostUrl);
    });

    it("Failed to trigger the daemon if nextUrl is not set", async () => {
      const errMessage =
        "Next instance url is not set for this node. Unable to set up the daemon";
      await expect(server.triggerDaemon("", 1)).rejects.toThrowError(
        errMessage,
      );
    });

    it("Triggers daemon with minimal 1 day interval if the interval is zero", () => {
      waiter.reset(1);
      const wrongInterval = 0;
      return Promise.all([
        waiter.waitForCondition(),
        server.triggerDaemon(nextUrl, wrongInterval),
      ])
        .then(() => {
          expect(jest.getTimerCount()).toBe(1);
          expect(requestHealthData).toHaveBeenCalledWith(hostUrl);
          expect(requestHealthData).toHaveBeenCalledTimes(1);
          requestHealthData.mockClear();
          waiter.reset(1);
          jest.advanceTimersByTime(oneMinute);
          return waiter.waitForCondition();
        })
        .then(() => {
          expect(requestHealthData).toHaveBeenCalledWith(hostUrl);
          expect(requestHealthData).toHaveBeenCalledTimes(1);
          requestHealthData.mockClear();
          waiter.reset(3);
          jest.advanceTimersByTime(oneMinute);
          return waiter.waitForCondition();
        })
        .then(() => {
          expect(requestHealthData).toHaveBeenCalledWith(nextUrl);
          expect(requestHealthData).toHaveBeenCalledTimes(2);
          requestHealthData.mockClear();
          expect(clearIntervalSpy).toHaveBeenCalledWith(expect.any(Object));
          expect(jest.getTimerCount()).toBe(0);
          jest.advanceTimersByTime(oneDayMinutes);
          expect(requestHealthData).not.toBeCalled();
        });
    });

    it("Triggers daemon with minimal 1 day interval if the interval is negative", async () => {
      const wrongInterval = -2;
      await server.triggerDaemon(nextUrl, wrongInterval);
      expect(jest.getTimerCount()).toBe(1);
      expect(requestHealthData).toHaveBeenCalledWith(hostUrl);
      expect(requestHealthData).toHaveBeenCalledTimes(1);
    });
  });
});
