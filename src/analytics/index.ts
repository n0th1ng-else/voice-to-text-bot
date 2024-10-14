import { Logger } from "../logger/index.js";
import { collectEvents as collectGA } from "./ga/index.js";
import { collectEvents as collectAmplitude } from "./amplitude/index.js";
import { type AnalyticsData } from "./ga/types.js";

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
