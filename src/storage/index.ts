import { resolve as resolvePath } from "node:path";
import { readdirSync, statSync } from "node:fs";
import { Logger } from "../logger/index.js";
import { getMB } from "../memory/index.js";
import type { AnalyticsEventExt } from "../analytics/ga/types.js";
import { collectEvents } from "../analytics/amplitude/index.js";

const logger = new Logger("storage");

export const printCurrentStorageUsage = async (
  dir: string,
): Promise<number> => {
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
      const cacheSizeMBytes = Math.ceil(cacheSizeBytes / getMB(1));
      const size =
        cacheSizeMBytes < 1 ? "almost empty" : `[size=${cacheSizeMBytes}Mb]`;
      const list = files.length ? `[files=${files.join(",")}]` : "no files";
      const message = `Current storage ${size} ${list}`;
      if (cacheSizeMBytes < 50) {
        logger.info(message);
        return cacheSizeMBytes;
      }
      if (cacheSizeMBytes < 100) {
        logger.warn(message);
        return cacheSizeMBytes;
      }

      logger.error(
        message,
        new Error("The process exceeds cache storage limit"),
      );
      return cacheSizeMBytes;
    } catch (err) {
      logger.error("Unable to read the cache folder size", err);
      return 0;
    }
  });
};

export const sendStorageStatAnalytics = async (
  sizeMb: number,
  appVersion: string,
): Promise<void> => {
  const event: AnalyticsEventExt = {
    name: "flow",
    params: {
      size: sizeMb,
      app_version: appVersion,
      page_location: "system/internal/ssd",
      page_title: `Internal system metrics`,
      thread_id: 0,
      engagement_time_msec: 0,
      language: "en",
      screen_resolution: "1920x1080",
      page_referrer: "https://dev.null",
      page_meta: "",
    },
  };
  await collectEvents("system_executor", [event]);
};
