import { it, describe, expect, vi, beforeAll } from "vitest";
import {
  injectDependencies,
  type InjectedFn,
} from "../testUtils/dependencies.ts";

vi.mock("../logger/index");

let getHostName: InjectedFn["getHostName"];

describe("Tunnel handling", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    getHostName = init.getHostName;
  });

  it("Do nothing if self url provided", () => {
    const url = "some-custom-url";
    return getHostName(3000, url, false).then((finalUrl) =>
      expect(finalUrl).toBe(url),
    );
  });
});
