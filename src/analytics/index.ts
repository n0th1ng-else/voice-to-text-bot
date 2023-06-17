import { Logger } from "../logger/index.js";
import { flattenPromise } from "../common/helpers.js";
import { collectEvents as collectGA } from "./ga/index.js";
import { collectEvents as collectAmplitude } from "./amplitude/index.js";
import { AnalyticsData } from "./ga/types.js";

const logger = new Logger("analytics");

export const collectAnalytics = (analytics: AnalyticsData): Promise<void> => {
  logger.info("Collecting analytic data");
  const evts = analytics.getEvents();
  const id = analytics.getId();

  return Promise.all([collectGA(id, evts), collectAmplitude(id, evts)])
    .then(flattenPromise)
    .catch((err) => logger.warn("Failed to collect analytic data", err));
};
