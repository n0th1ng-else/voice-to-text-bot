import { it, describe, expect } from "@jest/globals";
import { getHostName } from "./tunnel.js";

describe("Tunnel handling", () => {
  it("Do nothing if self url provided", () => {
    const url = "some-custom-url";
    return getHostName(3000, url, false).then((finalUrl) =>
      expect(finalUrl).toBe(url)
    );
  });
});
