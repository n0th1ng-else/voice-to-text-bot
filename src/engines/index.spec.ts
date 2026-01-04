import { describe, it, expect, vi, afterEach } from "vitest";
import { getRuntimeEngineType, isNode } from "./index.js";

describe("engines", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return unknown engine if no node detected", () => {
    vi.stubGlobal("process", {
      ...process,
      versions: {},
    });
    const { engine, version } = getRuntimeEngineType();
    expect(engine).toEqual("unknown");
    expect(version).toEqual("n/a");
    expect(isNode()).toEqual(false);
  });

  it("should return the node version", () => {
    vi.stubGlobal("process", {
      ...process,
      versions: { node: "24.1.1" },
    });
    const { engine, version } = getRuntimeEngineType();
    expect(engine).toEqual("node");
    expect(version).toEqual("24.1.1");
    expect(isNode()).toEqual(true);
  });
});
