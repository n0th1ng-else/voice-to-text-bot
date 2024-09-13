import { Logger } from "../logger/index.js";
import type { AnalyticsEventExt } from "../analytics/ga/types.js";
import { collectEvents } from "../analytics/amplitude/index.js";

const logger = new Logger("memory");

const getMb = (stat: number): number => {
  const mb = getMB(1);
  return Math.ceil(stat / mb);
};

const getMemoryUsageMb = (): NodeJS.MemoryUsage => {
  const stat = process.memoryUsage();
  return {
    heapTotal: getMb(stat.heapTotal),
    heapUsed: getMb(stat.heapUsed),
    external: getMb(stat.external),
    rss: getMb(stat.rss),
    arrayBuffers: stat.arrayBuffers,
  };
};

export const SIZE_UNIT = 1024;

export const getMB = (mb: number): number => {
  return SIZE_UNIT * SIZE_UNIT * mb;
};

export const printCurrentMemoryStat = async (
  limit?: number,
  offset = 15,
): Promise<number> => {
  return Promise.resolve().then(() => {
    const stat = getMemoryUsageMb();
    const line = `Current usage [rss=${stat.rss}Mb] [heapTotal=${stat.heapTotal}Mb] [heapUsed=${stat.heapUsed}Mb]`;
    if (!limit) {
      logger.info(line);
      return stat.rss;
    }

    const fullStat = 100;
    const dangerStat = fullStat - offset;
    const warningStat = dangerStat - offset;
    const statDiff = (stat.rss * fullStat) / limit;

    if (statDiff > fullStat) {
      logger.error(
        `The process exceeds memory limit ${limit}Mb! ${line}`,
        new Error("The process exceeds memory limit"),
      );
      return stat.rss;
    }

    if (statDiff > dangerStat) {
      logger.error(line, new Error(line));
      return stat.rss;
    }

    if (statDiff > warningStat) {
      logger.warn(line);
      return stat.rss;
    }

    logger.info(line);
    return stat.rss;
  });
};

export const sendMemoryStatAnalytics = async (
  sizeMb: number,
  appVersion: string,
): Promise<void> => {
  const event: AnalyticsEventExt = {
    name: "flow",
    params: {
      size: sizeMb,
      app_version: appVersion,
      page_location: "system/internal",
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
