import axios, { AxiosError } from "axios";
import { HealthDto } from "./types.js";

class HealthError extends Error {
  public code = 0;
  public response?: unknown;
  public url = "";

  constructor(cause: Error, message = "Health request was unsuccessful") {
    super(`EINTERNAL ${message}`, { cause });
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

export const requestHealthData = (domain: string): Promise<HealthDto> => {
  const url = getHealthUrl(domain);
  return axios
    .request<HealthDto>({
      method: "GET",
      url,
      responseType: "json",
    })
    .then(({ data: health }) => health)
    .catch((err: AxiosError) => {
      const healthError = new HealthError(err, err.message)
        .setUrl(url)
        .setErrorCode(err?.response?.status)
        .setResponse(err?.response?.data);
      throw healthError;
    });
};
