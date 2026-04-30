export class APIVoiceConverterError extends Error {
  public code = 0;
  public response?: string;
  public url = "";

  constructor(cause: unknown, message = "Request was unsuccessful") {
    super(`EAPICONVERTER ${message}`, { cause });
  }

  public setResponseCode(code = 0): this {
    this.code = code;
    return this;
  }

  public setResponse(response?: string): this {
    this.response = response;
    return this;
  }

  public setUrl(url: string): this {
    this.url = url;
    return this;
  }
}

export const isVoiceTooLongError = (err: unknown): err is APIVoiceConverterError => {
  return err instanceof APIVoiceConverterError && err.code === 413;
};

export const getReportedDurationSec = (err: APIVoiceConverterError): number => {
  if (!err.response) {
    return 0;
  }
  try {
    const parsed = JSON.parse(err.response) as { duration_seconds?: number };
    return typeof parsed.duration_seconds === "number" ? parsed.duration_seconds : 0;
  } catch {
    return 0;
  }
};
