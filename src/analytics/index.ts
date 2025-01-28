import { Logger } from "../logger/index.ts";
import { collectEvents as collectGA } from "./ga/index.ts";
import { collectEvents as collectAmplitude } from "./amplitude/index.ts";
import { type AnalyticsData } from "./ga/types.ts";

const logger = new Logger("analytics");

export const collectAnalytics = async (
  analytics: AnalyticsData,
): Promise<void> => {
  logger.debug("Collecting analytic data");
  const evts = analytics.getEvents();
  const id = analytics.getId();

  try {
    await Promise.all([collectGA(id, evts), collectAmplitude(id, evts)]);
  } catch (err) {
    logger.error("Failed to collect analytic data", err);
  }
};
