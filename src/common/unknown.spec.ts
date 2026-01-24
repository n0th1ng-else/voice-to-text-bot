import { describe, it, expect } from "vitest";
import { fetchPropFromUnknown, unknownHasMessage, unknownHasText } from "./unknown.js";

describe("unknown", () => {
  it.each([
    [true, false],
    ["test", false],
    [null, false],
    [{ text: 1 }, false],
    [{ text: "bar" }, false],
  ])("unknownHasMessage %s is %s", (input, expected) => {
    expect(unknownHasMessage(input)).toEqual(expected);
  });

  it.each([
    [true, false],
    ["test", false],
    [null, false],
    [{ message: 1 }, false],
    [{ message: "bar" }, false],
  ])("unknownHasText %s is %s", (input, expected) => {
    expect(unknownHasText(input)).toEqual(expected);
  });

  it.each([
    [true, "def-value"],
    ["test", "def-value"],
    [null, "def-value"],
    [{ message: 1 }, 1],
    [{ message: "bar" }, "bar"],
  ])("fetchPropFromUnknown %s is %s", (input, expected) => {
    expect(fetchPropFromUnknown(input, "message", "def-value")).toEqual(expected);
  });
});
