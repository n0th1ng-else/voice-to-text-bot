import { describe, it, expect, vi } from "vitest";
import axios, {
  AxiosError,
  type AxiosRequestConfig,
  AxiosHeaders,
} from "axios";
import { requestHealthData } from "./api.js";
import { type HealthDto, HealthSsl, HealthStatus } from "./types.js";

const mockRequest = (
  fn: (config?: AxiosRequestConfig) => Promise<HealthDto>,
) => {
  vi.spyOn(axios, "request").mockImplementationOnce(
    (config?: AxiosRequestConfig) => {
      expect(config?.method).toBe("GET");
      expect(config?.responseType).toBe("json");
      return Promise.resolve().then(() => fn(config));
    },
  );
};

const TEST_URL = "https://google.com";

const TEST_RESPONSE: HealthDto = {
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

describe("requestHealthData", () => {
  it("should add /health in the url path", async () => {
    mockRequest((cfg) => {
      expect(cfg?.url).toBe(`${TEST_URL}/health`);
      return Promise.resolve(TEST_RESPONSE);
    });
    await requestHealthData(TEST_URL);
  });

  it("should construct health error with standard message", async () => {
    const errCause = new AxiosError(undefined, "400", undefined, undefined, {
      status: 400,
      config: {
        headers: new AxiosHeaders(),
      },
      headers: {},
      statusText: "Bad Request",
      data: {
        foo: "bar",
      },
    });
    mockRequest(() => Promise.reject(errCause));

    try {
      await requestHealthData(TEST_URL);
      return Promise.reject(new Error("Should not resolve"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      expect(err.cause).toBe(errCause);
      expect(err.message).toBe("EINTERNAL Health request was unsuccessful");
      expect(err.code).toBe(400);
      expect(err.response).toBe(errCause.response?.data);
      expect(err.url).toBe(`${TEST_URL}/health`);
    }
  });

  it("should construct health error with custom message", async () => {
    const errCause = new AxiosError(
      "something went wrong...",
      "400",
      undefined,
      undefined,
      {
        status: 400,
        config: {
          headers: new AxiosHeaders(),
        },
        headers: {},
        statusText: "Bad Request",
        data: {
          foo: "bar",
        },
      },
    );
    mockRequest(() => Promise.reject(errCause));

    try {
      await requestHealthData(TEST_URL);
      return Promise.reject(new Error("Should not resolve"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      expect(err.cause).toBe(errCause);
      expect(err.message).toBe(`EINTERNAL ${errCause.message}`);
      expect(err.code).toBe(400);
      expect(err.response).toBe(errCause.response?.data);
      expect(err.url).toBe(`${TEST_URL}/health`);
    }
  });
});
