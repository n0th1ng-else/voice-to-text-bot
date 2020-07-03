import request from "supertest";
import { ExpressServer } from "../src/server/express";
import { HealthSsl, HealthStatus } from "../src/server/types";
import { appVersion } from "../src/env";
import { localhostUrl } from "../src/const";

const appPort = 3300;
const enableSSL = false;
const host = request(`${localhostUrl}:${appPort}`);
const path = "/health";

let stopHandler: () => Promise<void> = () =>
  Promise.reject(new Error("Server did not start"));

jest.mock("../src/logger");

describe("[health]", () => {
  beforeAll(() => {
    const server = new ExpressServer(appPort, enableSSL, appVersion);
    return server.start().then((stopFn) => (stopHandler = stopFn));
  });

  afterAll(() => stopHandler());

  it("initial api access", () => {
    return host.get(path).then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.ssl).toBe(HealthSsl.Off);
      expect(res.body.status).toBe(HealthStatus.InProgress);
      expect(res.body.urls).toEqual([]);
    });
  });
});
