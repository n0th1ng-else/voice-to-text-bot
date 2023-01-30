import { it, describe, expect, jest, beforeAll } from "@jest/globals";
import { injectDependencies } from "../testUtils/dependencies.js";

jest.unstable_mockModule(
  "../logger/index",
  () => import("../logger/__mocks__/index.js")
);

let getHostName;

describe("Tunnel handling", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    getHostName = init.getHostName;
  });

  it("Do nothing if self url provided", () => {
    const url = "some-custom-url";
    return getHostName(3000, url, false).then((finalUrl) =>
      expect(finalUrl).toBe(url)
    );
  });
});
