import { describe, it, expect } from "vitest";
import { getHostDomain } from "./url.js";

describe("url", () => {
  it("should return the full url if it is a top level domain", () => {
    expect(getHostDomain("google.com")).toBe("google.com");
  });

  it("should sanitize the third-level domains", () => {
    expect(getHostDomain("myapp.google.com")).toBe("***.google.com");
  });
});
