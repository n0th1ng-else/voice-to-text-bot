import { ScheduleDaemon } from "./index.js";
import { printCurrentStorageUsage, sendStorageStatAnalytics } from "../storage/index.js";

export const initStorageDaemon = (appVersion: string): ScheduleDaemon => {
  return new ScheduleDaemon("storage", async () => {
    const value = await printCurrentStorageUsage("file-temp");
    await sendStorageStatAnalytics(value, appVersion);
  });
};
