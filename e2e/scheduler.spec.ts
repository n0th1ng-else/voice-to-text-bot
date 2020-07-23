import {
  jest,
  expect,
  beforeEach,
  afterEach,
  it,
  describe,
} from "@jest/globals";
import { ExpressServer } from "../src/server/express";
import { appVersion } from "../src/env";
import { localhostUrl } from "../src/const";
import * as requestObj from "../src/server/request";
import { getHealthUrl } from "../src/server/helpers";
import { HealthDto, HealthSsl, HealthStatus } from "../src/server/types";
import { WaiterForCalls } from "./helpers/waitFor";
import { httpsOptions } from "../certs";

const waiter = new WaiterForCalls();

jest.mock("../src/logger");

const getHandler = requestObj.runGetDto;
const getRequestSpy = jest
  .spyOn(requestObj, "runGetDto")
  .mockImplementation((getUrl) => {
    if (getUrl.includes(nextUrl)) {
      const response: HealthDto = {
        version: "new2",
        urls: [],
        status: HealthStatus.Online,
        message: "ok",
        ssl: HealthSsl.Off,
        threadId: 0,
      };
      waiter.tick();
      return Promise.resolve(response);
    }
    return getHandler(getUrl).then((data) => {
      waiter.tick();
      return data;
    });
  });

const appPort = 3700;
const hostUrl = `${localhostUrl}:${appPort}`;
const nextUrl = `http://nexthost:${appPort + 1}`;

const oneMinute = 60_000;
const oneDayMinutes = 24 * 60;

let server: ExpressServer;
const enableSSL = false;

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

describe("[uptime daemon]", () => {
  beforeEach(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date().setHours(23, 58, 0, 0));
    server = new ExpressServer(appPort, enableSSL, appVersion, httpsOptions);
    return server.start().then((stopFn) => (stopHandler = stopFn));
  });

  afterEach(() => {
    jest.useRealTimers();
    getRequestSpy.mockClear();
    return stopHandler();
  });

  it("Failed to trigger the daemon if selfUrl is not set", (done) => {
    const errMessage =
      "Self url is not set for this node. Unable to set up the daemon";
    return server.triggerDaemon("", 1).then(
      () => {
        expect(done).toBeDefined();
        if (done) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
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

      return server.triggerDaemon("", 1).then(
        () => {
          expect(done).toBeDefined();
          if (done) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
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
          expect(getRequestSpy).toBeCalledWith(getHealthUrl(hostUrl));
          expect(getRequestSpy).toBeCalledTimes(1);
          getRequestSpy.mockClear();
          waiter.reset(1);
          jest.advanceTimersByTime(oneMinute);
          return waiter.waitForCondition();
        })
        .then(() => {
          expect(getRequestSpy).toBeCalledWith(getHealthUrl(hostUrl));
          expect(getRequestSpy).toBeCalledTimes(1);
          getRequestSpy.mockClear();
          waiter.reset(2);
          jest.advanceTimersByTime(oneMinute);
          return waiter.waitForCondition();
        })
        .then(() => {
          expect(getRequestSpy).lastCalledWith(getHealthUrl(nextUrl));
          expect(getRequestSpy).toBeCalledTimes(2);
          expect(jest.getTimerCount()).toBe(0);

          getRequestSpy.mockClear();
          jest.advanceTimersByTime(oneDayMinutes);
          expect(getRequestSpy).not.toBeCalled();
        });
    });

    it("Triggers daemon with minimal 1 day interval if the interval is negative", () => {
      const wrongInterval = -2;
      return server.triggerDaemon(nextUrl, wrongInterval).then(() => {
        expect(jest.getTimerCount()).toBe(1);
        expect(getRequestSpy).toBeCalledWith(getHealthUrl(hostUrl));
        expect(getRequestSpy).toBeCalledTimes(1);
      });
    });
  });
});
