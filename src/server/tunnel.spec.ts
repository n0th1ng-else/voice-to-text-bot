import { it, describe, expect, vi } from "vitest";
import { getHostName } from "./tunnel.js";

vi.mock("../logger/index");

describe("Tunnel handling", () => {
  it("Do nothing if self url provided", () => {
    const url = "some-custom-url";
    return getHostName(3000, url, false).then((finalUrl) => expect(finalUrl).toBe(url));
  });
});
