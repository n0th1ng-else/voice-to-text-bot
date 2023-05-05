export class WitAiError extends Error {
  public code = 0;
  public response?: unknown;
  public url = "";

  constructor(message = "WitAi request was unsuccessful", cause: Error) {
    super(`EWITAI ${message}`, { cause });
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
