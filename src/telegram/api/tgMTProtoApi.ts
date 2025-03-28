import { TelegramClient } from "@mtcute/node";
import type { FileId } from "./core.js";

export type TgProto = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  downloadFile: (toFilename: string, fileId: FileId) => Promise<string>;
};

export const getMTProtoApi = (
  appId: number,
  appHash: string,
  apiToken: string,
): TgProto => {
  const client = new TelegramClient({
    apiId: appId,
    apiHash: appHash,
  });

  return {
    start: async (): Promise<void> => {
      await client.start({
        botToken: apiToken,
      });
    },
    stop: async () => {
      await client.close();
    },
    downloadFile: async (
      toFilename: string,
      fileId: FileId,
    ): Promise<string> => {
      await client.downloadToFile(toFilename, fileId);
      return toFilename;
    },
  };
};
