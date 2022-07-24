import {
  jest,
  expect,
  beforeEach,
  afterEach,
  it,
  describe,
} from "@jest/globals";
import axios, { AxiosRequestConfig, AxiosStatic } from "axios";
import { ExpressServer } from "../src/server/express";
import { appVersion } from "../src/env";
import { localhostUrl } from "../src/const";
import { getHealthUrl } from "../src/server/helpers";
import { HealthDto, HealthSsl, HealthStatus } from "../src/server/types";
import { WaiterForCalls } from "./helpers/waitFor";
import { httpsOptions } from "../certs";

const waiter = new WaiterForCalls();

jest.mock("../src/logger");
jest.mock("../src/env");

const appPort = 3700;
const hostUrl = `${localhostUrl}:${appPort}`;
const nextUrl = `http://nexthost:${appPort + 1}`;

const clientSpy = jest
  .spyOn<AxiosStatic, "request">(axios, "request")
  .mockImplementation((config?: AxiosRequestConfig) => {
    if (!config) {
      throw new Error("config can not be empty");
    }

    expect(config.method).toBe("GET");
    expect(config.responseType).toBe("json");

    const dto: HealthDto = {
      version: "new2",
      urls: [],
      status: HealthStatus.Online,
      message: "ok",
      ssl: HealthSsl.Off,
      threadId: 0,
    };
    waiter.tick();
    return Promise.resolve({ data: dto });
  });

let realClearInterval = global.clearInterval;
let clearIntervalSpy = jest
  .spyOn(global, "clearInterval")
  .mockImplementation((interval) => {
    realClearInterval(interval);
    waiter.tick();
  });

const oneMinute = 60_000;
const oneDayMinutes = 24 * 60;

let server: ExpressServer;
const enableSSL = false;

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

describe("[uptime daemon]", () => {
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

    server = new ExpressServer(appPort, enableSSL, appVersion, httpsOptions);
    return server.start().then((stopFn) => (stopHandler = stopFn));
  });

  afterEach(() => {
    clientSpy.mockClear();
    clearIntervalSpy.mockClear();
    return stopHandler().finally(() => {
      jest.useRealTimers();
    });
  });

  it("Failed to trigger the daemon if selfUrl is not set", (done) => {
    const errMessage =
      "Self url is not set for this node. Unable to set up the daemon";

    server.triggerDaemon("", 1).then(
      () => {
        expect(done).toBeDefined();
        if (done) {
          // @ts-expect-error Somehow the .fail() handler is not a part of the Jest interface
          done.fail(errMessage);
        }
      },
      (err) => {
        expect(err.message).toBe(errMessage);
        expect(done).toBeDefined();
        if (done) {
          done();
        }
      }
    );
  });

  describe("has selfUrl", () => {
    beforeEach(() => {
      server.setSelfUrl(hostUrl);
    });

    it("Failed to trigger the daemon if nextUrl is not set", (done) => {
      const errMessage =
        "Next node url is not set for this node. Unable to set up the daemon";

      server.triggerDaemon("", 1).then(
        () => {
          expect(done).toBeDefined();
          if (done) {
            // @ts-expect-error Somehow the .fail() handler is not a part of the Jest interface
            done.fail(errMessage);
          }
        },
        (err) => {
          expect(err.message).toBe(errMessage);
          expect(done).toBeDefined();
          if (done) {
            done();
          }
        }
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
          expect(clientSpy).toBeCalledWith({
            method: "GET",
            responseType: "json",
            url: getHealthUrl(hostUrl),
          });
          expect(clientSpy).toBeCalledTimes(1);
          clientSpy.mockClear();
          waiter.reset(1);
          jest.advanceTimersByTime(oneMinute);
          return waiter.waitForCondition();
        })
        .then(() => {
          expect(clientSpy).toBeCalledWith({
            method: "GET",
            responseType: "json",
            url: getHealthUrl(hostUrl),
          });
          expect(clientSpy).toBeCalledTimes(1);
          clientSpy.mockClear();
          waiter.reset(3);
          jest.advanceTimersByTime(oneMinute);
          return waiter.waitForCondition();
        })
        .then(() => {
          expect(clientSpy).lastCalledWith({
            method: "GET",
            responseType: "json",
            url: getHealthUrl(nextUrl),
          });
          expect(clientSpy).toBeCalledTimes(2);
          expect(clearIntervalSpy).toHaveBeenCalledWith(expect.any(Object));

          expect(jest.getTimerCount()).toBe(0);

          clientSpy.mockClear();
          jest.advanceTimersByTime(oneDayMinutes);
          expect(clientSpy).not.toBeCalled();
        });
    });

    it("Triggers daemon with minimal 1 day interval if the interval is negative", () => {
      const wrongInterval = -2;
      return server.triggerDaemon(nextUrl, wrongInterval).then(() => {
        expect(jest.getTimerCount()).toBe(1);
        expect(clientSpy).toBeCalledWith({
          method: "GET",
          responseType: "json",
          url: getHealthUrl(hostUrl),
        });
        expect(clientSpy).toBeCalledTimes(1);
      });
    });
  });
});
