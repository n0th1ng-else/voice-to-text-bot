import { resolve as resolvePath } from "node:path";
import { copyFileSync } from "node:fs";
import type { TgProto } from "../tgMTProtoApi.js";
import type { FileId } from "../core.js";
import { fileURLToPath } from "node:url";

let currentFileId: FileId | undefined;

export const setCurrentMockFileId = (id: FileId): void => {
  currentFileId = id;
};

export const getMTProtoApi = (): TgProto => {
  return {
    isInitialized: () => true,
    start: async (): Promise<void> => {
      return Promise.resolve();
    },
    stop: async (): Promise<void> => {
      return Promise.resolve();
    },
    downloadFile: async (toFilename: string, fileId: FileId): Promise<string> => {
      if (!currentFileId) {
        throw new Error("MTPROTO mock - no currentFileId set!");
      }

      if (fileId !== currentFileId) {
        throw new Error("MTPROTO mock - wrong fileId!");
      }
      const currentDir = fileURLToPath(new URL(".", import.meta.url));
      const mockFilePath = resolvePath(currentDir, "sample_file.oga");
      copyFileSync(mockFilePath, toFilename);
      currentFileId = undefined;
      return Promise.resolve(toFilename);
    },
    sendFile(): Promise<void> {
      return Promise.resolve();
    },
  };
};
