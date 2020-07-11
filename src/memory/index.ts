import { Logger } from "../logger";

const logger = new Logger("memory");

export function printCurrentMemoryStat(
  limit?: number,
  offset = 15
): Promise<void> {
  const stat = getMemoryUsageMb();
  const line = `Current usage [rss=${stat.rss}Mb] [heapTotal=${stat.heapTotal}Mb] [heapUsed=${stat.heapUsed}Mb]`;
  if (!limit) {
    logger.info(line);
    return Promise.resolve();
  }

  const fullStat = 100;
  const dangerStat = fullStat - offset;
  const warningStat = dangerStat - offset;
  const statDiff = (stat.rss * fullStat) / limit;

  if (statDiff > fullStat) {
    logger.error(`Process exceeds memory limit ${limit}Mb! ${line}`);
    return Promise.resolve();
  }

  if (statDiff > dangerStat) {
    logger.error(line);
    return Promise.resolve();
  }

  if (statDiff > warningStat) {
    logger.warn(line);
    return Promise.resolve();
  }

  logger.info(line);
  return Promise.resolve();
}

export function getMemoryUsageMb(): NodeJS.MemoryUsage {
  const stat = process.memoryUsage();
  return {
    heapTotal: getMb(stat.heapTotal),
    heapUsed: getMb(stat.heapUsed),
    external: getMb(stat.external),
    rss: getMb(stat.rss),
    arrayBuffers: stat.arrayBuffers,
  };
}

function getMb(stat: number): number {
  const mb = 1024 * 1024;
  return Math.ceil(stat / mb);
}
