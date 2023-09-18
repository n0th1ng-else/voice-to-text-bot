export class WitAiError extends Error {
  public code = 0;
  public response?: unknown;
  public url = "";
  public bufferLength = -1;

  constructor(cause: unknown, message = "Request was unsuccessful") {
    super(`EWITAI ${message}`, { cause });
  }

  public setErrorCode(code = 0): this {
    this.code = code;
    return this;
  }

  public setResponse(response?: unknown): this {
    if (typeof response !== "string") {
      this.response = { message: response };
      return this;
    }

    try {
      this.response = JSON.parse(response);
    } catch (err) {
      this.response = { message: response };
    }

    return this;
  }

  public setUrl(url: string): this {
    this.url = url;
    return this;
  }

  public setBufferLength(buff: Buffer): this {
    this.bufferLength = buff?.length ?? -1;
    return this;
  }
}

export class WitAiChunkError extends Error {
  public code?: string;
  public response?: string;

  constructor(cause: unknown, message = "Received chunk with error") {
    super(`EWITAI ${message}`, { cause });
  }

  public setErrorCode(code?: string): this {
    this.code = code;
    return this;
  }

  public setResponse(response?: string): this {
    this.response = response;
    return this;
  }
}
