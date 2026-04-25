import { describe, it, expect, vi } from "vitest";
import { getResponseErrorData } from "./error.js";

describe("getResponseErrorData", () => {
  it("should return text when no options are provided", async () => {
    const response = new Response("plain text");
    const result = await getResponseErrorData(response);
    expect(result).toBe("plain text");
  });

  it("should return JSON object when toJson is true and response is valid JSON", async () => {
    const testErr = { error: "some error" };
    const response = new Response(JSON.stringify(testErr));

    const result = await getResponseErrorData(response, { toJson: true });
    expect(result).toEqual({ error: "some error" });
  });

  it("should return raw text when toJson is true but response is not valid JSON", async () => {
    const response = new Response("broken JSON");

    const result = await getResponseErrorData(response, { toJson: true });
    expect(result).toBe("broken JSON");
  });

  it("should return 'no response' when response.text() throws", async () => {
    const response = {
      text: vi.fn().mockRejectedValue(new Error("Network Error")),
    } as unknown as Response;

    const result = await getResponseErrorData(response);
    expect(result).toBe("no response");
  });

  it("should return text when toJson is false", async () => {
    const response = new Response('{"error":"some error"}');

    const result = await getResponseErrorData(response, { toJson: false });
    expect(result).toBe('{"error":"some error"}');
  });
});
