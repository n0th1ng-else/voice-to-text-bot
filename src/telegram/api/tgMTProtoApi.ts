import { TelegramClient } from "@mtcute/node";
import type { ChatId, FileId } from "./core.js";
import { API_TIMEOUT_MS } from "../../const.js";

export type TgProto = {
  isInitialized: () => boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  downloadFile: (toFilename: string, fileId: FileId) => Promise<string>;
  sendFile: (chatId: ChatId, file: File) => Promise<void>;
};

// https://my.telegram.org/apps
export const getMTProtoApi = (
  appId: number,
  appHash: string,
  apiToken: string,
): TgProto => {
  let isInitialized = false;
  const client = new TelegramClient({
    apiId: appId,
    apiHash: appHash,
  });

  return {
    isInitialized: (): boolean => {
      return false;
    },
    start: async (): Promise<void> => {
      await client.start({
        botToken: apiToken,
      });
      isInitialized = true;
    },
    stop: async (): Promise<void> => {
      await client.destroy();
      isInitialized = false;
    },
    downloadFile: async (
      toFilename: string,
      fileId: FileId,
    ): Promise<string> => {
      if (!isInitialized) {
        throw new Error("EMTPROTO not initialized");
      }
      const ctrl = new AbortController();

      const timeout = setTimeout(() => {
        ctrl.abort(new Error("EMTPROTO Request timeout"));
      }, API_TIMEOUT_MS);

      await client.downloadToFile(toFilename, fileId, {
        abortSignal: ctrl.signal,
      });

      clearTimeout(timeout);

      return toFilename;
    },
    sendFile: async (chatId: ChatId, file: File): Promise<void> => {
      if (!isInitialized) {
        throw new Error("EMTPROTO not initialized");
      }

      await client.sendMedia(chatId, {
        type: "document",
        file: file,
      });
    },
  };
};
