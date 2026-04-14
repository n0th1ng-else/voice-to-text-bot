import { ScheduleDaemon } from "./index.js";
import { printCurrentMemoryStat, sendMemoryStatAnalytics } from "../memory/index.js";

export const initMemoryDaemon = (appVersion: string, memoryLimit?: number): ScheduleDaemon => {
  return new ScheduleDaemon("memory", async () => {
    const value = await printCurrentMemoryStat(memoryLimit);
    await sendMemoryStatAnalytics(value, appVersion);
  });
};
