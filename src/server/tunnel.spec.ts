import { it, describe, expect } from "@jest/globals";
import { getHostName } from "./tunnel";

describe("Tunnel handling", () => {
  it("Do nothing if self url provided", () => {
    const url = "some-custom-url";
    return getHostName(3000, url).then((finalUrl) =>
      expect(finalUrl).toBe(url)
    );
  });
});
