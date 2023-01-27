import { AnalyticsData } from "./legacy/types.js";
import { collectEvents as collectLegacy } from "./legacy/index.js";
import { analyticsId } from "../env.js";
import { Logger } from "../logger/index.js";
import { flattenPromise } from "../common/helpers.js";
import { BotCommand } from "../telegram/types.js";
import { collectEvents as collectV4 } from "./v4/index.js";
import { collectEvents as collectAmplitude } from "./amplitude/index.js";

const logger = new Logger("analytics");

export const collectAnalytics = (analytics: AnalyticsData): Promise<void> => {
  logger.info("Collecting analytic data");
  const evts = analytics.v4.getEvents();

  return Promise.all([
    analytics.getListDto(analyticsId).map((dto) => collectLegacy(dto)),
    collectV4(analytics.v4.getId(), evts),
    collectAmplitude(analytics.v4.getId(), evts),
  ]).then(flattenPromise);
};

export const collectPageAnalytics = (
  analytics: AnalyticsData,
  page: BotCommand | "/voice"
): Promise<void> => {
  logger.info("Collecting page analytic data");
  return collectLegacy(analytics.getPageDto(analyticsId, page));
};
