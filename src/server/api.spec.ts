import { describe, it, expect, vi } from "vitest";
import { HealthError, requestHealthData } from "./api.js";
import { type HealthDto, HealthSsl, HealthStatus } from "./types.js";

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
    const testResponse = new Response(JSON.stringify(TEST_RESPONSE), { status: 200 });
    const mocked = vi.spyOn(global, "fetch").mockResolvedValue(testResponse);
    await requestHealthData(TEST_URL);
    expect(mocked).toHaveBeenCalledWith(`${TEST_URL}/health`, {
      method: "GET",
    });
  });

  it("should return the system health json", async () => {
    const testResponse = new Response(JSON.stringify(TEST_RESPONSE), { status: 200 });
    vi.spyOn(global, "fetch").mockResolvedValue(testResponse);
    const data = await requestHealthData(TEST_URL);
    expect(data).toEqual(TEST_RESPONSE);
  });

  describe("errors", () => {
    it("should get the API response but fail to parse json", async () => {
      const testResponse = new Response("{broken-json", {
        status: 200,
        statusText: "ok",
      });

      const testError = new HealthError(
        expect.any(Error),
        "Expected property name or '}' in JSON at position 1 (line 1 column 2)",
      ).setUrl(`${TEST_URL}/health`);

      vi.spyOn(global, "fetch").mockResolvedValue(testResponse);
      await expect(requestHealthData(TEST_URL)).rejects.toThrowError(testError);
    });
  });

  it("should get the API error and there is no response", async () => {
    const testResponse = new Response(null, {
      status: 400,
      statusText: "ok",
    });

    vi.spyOn(global, "fetch").mockResolvedValue(testResponse);

    try {
      await requestHealthData(TEST_URL);
      throw new Error("Should not resolve");
    } catch (err) {
      const { url, code, response } = err as HealthError;
      expect(url).toEqual(`${TEST_URL}/health`);
      expect(code).toEqual(400);
      expect(response).toEqual("");
    }
  });

  it("should get the API error and parse the text", async () => {
    const testResponse = new Response(JSON.stringify("TEST RESPONSE"), {
      status: 400,
      statusText: "ok",
    });

    vi.spyOn(global, "fetch").mockResolvedValue(testResponse);

    try {
      await requestHealthData(TEST_URL);
      throw new Error("Should not resolve");
    } catch (err) {
      const { url, code, response } = err as HealthError;
      expect(url).toEqual(`${TEST_URL}/health`);
      expect(code).toEqual(400);
      expect(response).toEqual("TEST RESPONSE");
    }
  });

  it("should get the API error and parse the json", async () => {
    const testResponse = new Response(JSON.stringify({ foo: "bar" }), {
      status: 400,
      statusText: "ok",
    });

    vi.spyOn(global, "fetch").mockResolvedValue(testResponse);

    try {
      await requestHealthData(TEST_URL);
      throw new Error("Should not resolve");
    } catch (err) {
      const { url, code, response } = err as HealthError;
      expect(url).toEqual(`${TEST_URL}/health`);
      expect(code).toEqual(400);
      expect(response).toEqual({ foo: "bar" });
    }
  });
});
