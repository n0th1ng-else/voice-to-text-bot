import {
  vi,
  expect,
  beforeEach,
  afterEach,
  it,
  describe,
  beforeAll,
  type MockInstance,
} from "vitest";
import {
  injectDependencies,
  type InjectedFn,
} from "../src/testUtils/dependencies.js";
import {
  type HealthDto,
  HealthSsl,
  HealthStatus,
} from "../src/server/types.js";
import type { VoidPromise } from "../src/common/types.js";

vi.mock("../src/logger/index");
vi.mock("../src/env");
vi.mock("../src/analytics/amplitude/index");

vi.mock("../src/server/api.js", () => {
  return {
    requestHealthData: vi.fn(() => {
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
let clearIntervalSpy: MockInstance;

const oneMinute = 60_000;
const oneDayMinutes = 24 * 60;

let server: InstanceType<InjectedFn["BotServerNew"]>;
let requestHealthData: MockInstance<InjectedFn["requestHealthData"]>;
let BotServer: InjectedFn["BotServerNew"];
let appVersion: InjectedFn["appVersion"];
let waiter: InstanceType<InjectedFn["WaiterForCalls"]>;
let hostUrl: string;
const webhookDoNotWait = false;

let stopHandler: VoidPromise = () =>
  Promise.reject(new Error("Server did not start"));

describe("[uptime daemon]", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    requestHealthData = vi.spyOn(init, "requestHealthData");
    BotServer = init.BotServerNew;
    appVersion = init.appVersion;

    const localhostUrl = init.localhostUrl;
    const WaiterForCalls = init.WaiterForCalls;

    hostUrl = `${localhostUrl}:${appPort}`;
    waiter = new WaiterForCalls();
  });

  beforeEach(() => {
    vi.useFakeTimers({
      now: new Date().setHours(23, 58, 0, 0),
      shouldAdvanceTime: true,
    });
    vi.clearAllTimers();
    realClearInterval = global.clearInterval;
    clearIntervalSpy = vi
      .spyOn(global, "clearInterval")
      .mockImplementation((interval) => {
        realClearInterval(interval);
        waiter.tick();
      });

    server = new BotServer(appPort, appVersion, webhookDoNotWait);
  });

  afterEach(async () => {
    clearIntervalSpy.mockRestore();
    requestHealthData.mockClear();
    vi.useRealTimers();
    await stopHandler();
  });

  describe("no selfUrl", () => {
    beforeEach(async () => {
      stopHandler = await server.start();
    });

    it("Failed to trigger the daemon if selfUrl is not set", async () => {
      const errMessage =
        "Self url is not set for this node. Unable to set up the daemon";
      await expect(server.triggerDaemon("", 1)).rejects.toThrowError(
        errMessage,
      );
    });
  });

  describe("has selfUrl", () => {
    beforeEach(async () => {
      server.setSelfUrl(hostUrl);
      stopHandler = await server.start();
    });

    it("Failed to trigger the daemon if nextUrl is not set", async () => {
      const errMessage =
        "Next instance url is not set for this node. Unable to set up the daemon";
      await expect(server.triggerDaemon("", 1)).rejects.toThrowError(
        errMessage,
      );
    });

    it("Triggers the daemon with the interval and delegates to the next node after we hit the limit", async () => {
      waiter.reset(1);
      const interval = 1;
      await Promise.all([
        waiter.waitForCondition(),
        server.triggerDaemon(nextUrl, interval),
      ]);

      expect(vi.getTimerCount()).toBe(1);
      expect(requestHealthData).toHaveBeenCalledWith(hostUrl);
      expect(requestHealthData).toHaveBeenCalledTimes(1);
      requestHealthData.mockClear();
      waiter.reset(1);
      vi.advanceTimersByTime(oneMinute);
      await waiter.waitForCondition();

      expect(requestHealthData).toHaveBeenCalledWith(hostUrl);
      expect(requestHealthData).toHaveBeenCalledTimes(1);
      requestHealthData.mockClear();
      waiter.reset(3);
      vi.advanceTimersByTime(oneMinute);
      await waiter.waitForCondition();

      expect(requestHealthData).toHaveBeenCalledWith(hostUrl);
      expect(requestHealthData).toHaveBeenLastCalledWith(nextUrl);
      // TODO why does the test call the nextUrl twice? (should be 2)
      expect(requestHealthData).toHaveBeenCalledTimes(3);
      requestHealthData.mockClear();
      expect(clearIntervalSpy).toHaveBeenCalledWith(expect.any(Object));
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(oneDayMinutes * oneMinute);
      expect(requestHealthData).not.toBeCalled();
    });

    it.each([
      ["negative", -2],
      ["zero", 0],
    ])(
      "Triggers daemon with minimal 1 day interval if the interval is %s",
      async (_, interval) => {
        await server.triggerDaemon(nextUrl, interval);
        expect(vi.getTimerCount()).toBe(1);
        expect(requestHealthData).toHaveBeenCalledWith(hostUrl);
        expect(requestHealthData).toHaveBeenCalledTimes(1);
      },
    );
  });
});
