import { TgError } from "./api/types.js";

export const hasNoRightsToSendMessage = (err: unknown): boolean => {
  if (err instanceof TgError) {
    const isErr = !err?.response?.ok;
    const isBadRequest = err?.response?.error_code === 400;
    const hasNoRights =
      err?.response?.description?.toLowerCase() ===
      "Bad Request: have no rights to send a message".toLowerCase();
    return isErr && isBadRequest && hasNoRights;
  }
  return false;
};

export const isBlockedByUser = (err: unknown): boolean => {
  if (err instanceof TgError) {
    const isErr = !err?.response?.ok;
    const isForbidden = err?.response?.error_code === 403;
    const isBlocked =
      err?.response?.description?.toLowerCase() ===
      "Forbidden: bot was blocked by the user".toLowerCase();
    return isErr && isForbidden && isBlocked;
  }
  return false;
};
