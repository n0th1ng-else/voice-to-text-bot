import { TgError } from "./api/types";

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
