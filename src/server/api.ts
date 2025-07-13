import axios, { isAxiosError } from "axios";
import type { HealthDto } from "./types.js";

class HealthError extends Error {
  public code = 0;
  public response?: unknown;
  public url = "";

  constructor(cause: unknown, message?: string) {
    const msg = message || "Health request was unsuccessful";
    super(`EINTERNAL ${msg}`, { cause });
  }

  public setErrorCode(code = 0): this {
    this.code = code;
    return this;
  }

  public setResponse(response?: unknown): this {
    this.response = response;
    return this;
  }

  public setUrl(url: string): this {
    this.url = url;
    return this;
  }
}

const getHealthUrl = (instanceUrl: string): string => {
  return `${instanceUrl}/health`;
};

export const requestHealthData = async (domain: string): Promise<HealthDto> => {
  const url = getHealthUrl(domain);
  try {
    const response = await axios.request<HealthDto>({
      method: "GET",
      url,
      responseType: "json",
    });
    return response.data;
  } catch (err) {
    if (isAxiosError(err)) {
      const healthError = new HealthError(err, err?.message)
        .setUrl(url)
        .setErrorCode(err?.response?.status)
        .setResponse(err?.response?.data);
      throw healthError;
    } else {
      // @ts-expect-error the error is most likely Error type, no unknown here but whatever
      const healthError = new HealthError(err, err?.message).setUrl(url);
      throw healthError;
    }
  }
};
