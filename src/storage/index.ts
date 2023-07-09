import { resolve as resolvePath } from "node:path";
import { readdirSync, statSync } from "node:fs";
import { Logger } from "../logger/index.js";

const logger = new Logger("storage");

export const printCurrentStorageUsage = (dir: string): Promise<void> => {
  return Promise.resolve().then(() => {
    try {
      const folder = resolvePath(process.cwd(), dir);
      const files = readdirSync(folder).filter(
        (file) => !file.includes("gitkeep"),
      );
      const cacheSizeBytes = files.reduce(
        (sum, file) => sum + statSync(resolvePath(folder, file)).size,
        0,
      );
      const cacheSizeMBytes = Math.ceil(cacheSizeBytes / (1024 * 1000));
      const size =
        cacheSizeMBytes < 1 ? "almost empty" : `[size=${cacheSizeMBytes}Mb]`;
      const list = files.length ? `[files=${files.join(",")}]` : "no files";
      const message = `Current storage ${size} ${list}`;
      if (cacheSizeMBytes < 50) {
        logger.info(message);
        return;
      }
      if (cacheSizeMBytes < 100) {
        logger.warn(message);
        return;
      }

      logger.error(
        message,
        new Error("The process exceeds cache storage limit"),
      );
    } catch (err) {
      logger.error("Unable to read the cache folder size", err);
    }
  });
};
