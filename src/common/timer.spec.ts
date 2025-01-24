import { describe, it, expect } from "vitest";
import { getLaunchDelay } from "./timer.js";

describe("getLaunchDelay", () => {
  it("returns 0 if the argument is 0", () => {
    expect(getLaunchDelay(0)).toBe(0);
  });

  it("reflects the argument minus one", () => {
    expect(getLaunchDelay(3)).toBe(20_000);
  });
});
