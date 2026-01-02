import type { HealthDto } from "./types.js";

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

const getErrorRawData = async (response: Response): Promise<string | undefined> => {
  try {
    const data = await response.text();
    return data;
  } catch {
    return;
  }
};

const getErrorData = async (response: Response): Promise<unknown> => {
  try {
    const data = await response.json();
    return data;
  } catch {
    const data = await getErrorRawData(response);
    return data;
  }
};

export const requestHealthData = async (domain: string): Promise<HealthDto> => {
  const url = getHealthUrl(domain);
  try {
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const data = await getErrorData(response);
      const errorMessage = "Failed to fetch health data";
      const healthError = new HealthError(new Error(errorMessage), errorMessage)
        .setUrl(url)
        .setErrorCode(response.status)
        .setResponse(data);
      throw healthError;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    if (err instanceof HealthError) {
      throw err;
    }
    // @ts-expect-error the error is most likely Error type, no unknown here but whatever
    const healthError = new HealthError(err, err?.message).setUrl(url);
    throw healthError;
  }
};
