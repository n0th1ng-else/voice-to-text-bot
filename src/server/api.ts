import type { HealthDto } from "./types.js";
import { getResponseErrorData } from "./error.js";
import { unknownHasMessage } from "../common/unknown.js";

export class HealthError extends Error {
  public code = 0;
  public response?: unknown;
  public url = "";

  constructor(cause: unknown, message = "Health request was unsuccessful") {
    super(`EHEALTH ${message}`, { cause });
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
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const data = await getResponseErrorData(response);
      const errorMessage = "Failed to fetch health data";
      const healthError = new HealthError(new Error(errorMessage), errorMessage)
        .setUrl(url)
        .setErrorCode(response.status)
        .setResponse(data);
      throw healthError;
    }

    const data = await response.json();
    // TODO validate type
    return data as HealthDto;
  } catch (err) {
    if (err instanceof HealthError) {
      throw err;
    }

    const healthError = new HealthError(
      err,
      unknownHasMessage(err) ? err.message : undefined,
    ).setUrl(url);
    throw healthError;
  }
};
