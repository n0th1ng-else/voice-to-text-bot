import { type TgCore } from "./types.js";
import { SANITIZE_CHARACTER } from "../../logger/const.js";
import { getRegExpFromString } from "../../common/helpers.js";

export class TgError extends Error {
  public code = 0;
  public chatId?: number;
  public response?: TgCore<void>;
  public migrateToChatId = 0;
  public retryAfter = 0;
  public url = "";

  constructor(cause: Error, message = "Telegram request was unsuccessful") {
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
          SANITIZE_CHARACTER,
        )
      : url;
    return this;
  }
}

const assertErrCondition = (
  err: unknown,
  status: number,
  text: string,
): boolean => {
  if (!(err instanceof TgError)) {
    return false;
  }
  const isErr = !err?.response?.ok;
  const isStatusExpected = err?.code === status;
  const isTextExpected =
    err?.response?.description?.toLowerCase() === text.toLowerCase();
  return isErr && isStatusExpected && isTextExpected;
};

export const hasNoRightsToSendMessage = (err: unknown): boolean => {
  return assertErrCondition(
    err,
    400,
    "Bad Request: not enough rights to send text messages to the chat",
  );
};

export const isKickedFromSupergroup = (err: unknown): boolean => {
  return assertErrCondition(
    err,
    403,
    "Forbidden: bot was kicked from the supergroup chat",
  );
};

export const isBlockedByUser = (err: unknown): boolean => {
  return assertErrCondition(err, 403, "Forbidden: bot was blocked by the user");
};

export const isMessageNotModified = (err: unknown): boolean => {
  return assertErrCondition(
    err,
    400,
    "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message",
  );
};
