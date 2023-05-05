import { TgCore } from "./types.js";
import { SANITIZE_CHARACTER } from "../../logger/const.js";
import { getRegExpFromString } from "../../common/helpers.js";

export class TgError extends Error {
  public code = 0;
  public chatId?: number;
  public response?: TgCore<void>;
  public migrateToChatId = 0;
  public retryAfter = 0;
  public url = "";

  constructor(message = "Telegram request was unsuccessful", cause: Error) {
    super(`ETELEGRAM ${message}`, { cause });
  }

  public setErrorCode(code = 0): this {
    this.code = code;
    return this;
  }

  public setResponse(response?: TgCore<void>): this {
    this.response = response;
    return this;
  }

  public setChatId(chatId?: number): this {
    this.chatId = chatId;
    return this;
  }

  public setRetryAfter(retryAfter = 0): this {
    this.retryAfter = retryAfter;
    return this;
  }

  public setMigrateToChatId(migrateToChatId = 0): this {
    this.migrateToChatId = migrateToChatId;
    return this;
  }

  public setUrl(url: string, apiToken: string): this {
    this.url = apiToken
      ? url.replace(
          getRegExpFromString(apiToken, ["g", "i"]),
          SANITIZE_CHARACTER
        )
      : url;
    return this;
  }
}

export const hasNoRightsToSendMessage = (err: unknown): boolean => {
  if (!(err instanceof TgError)) {
    return false;
  }
  const isErr = !err?.response?.ok;
  const isBadRequest = err?.code === 400;
  const hasNoRights =
    err?.response?.description?.toLowerCase() ===
    "Bad Request: not enough rights to send text messages to the chat".toLowerCase();

  return isErr && isBadRequest && hasNoRights;
};

export const isBlockedByUser = (err: unknown): boolean => {
  if (!(err instanceof TgError)) {
    return false;
  }
  const isErr = !err?.response?.ok;
  const isForbidden = err?.code === 403;
  const isBlocked =
    err?.response?.description?.toLowerCase() ===
    "Forbidden: bot was blocked by the user".toLowerCase();
  return isErr && isForbidden && isBlocked;
};
