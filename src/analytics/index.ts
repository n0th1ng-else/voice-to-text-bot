import { AnalyticsData } from "./api/types";
import { collectEvents } from "./api";
import { analyticsId } from "../env";
import { Logger } from "../logger";
import { flattenPromise } from "../common/helpers";
import { BotCommand } from "../telegram/types";

const logger = new Logger("analytics");

export const collectAnalytics = (
  analytics: AnalyticsData,
  page?: BotCommand | "/voice"
): Promise<void> => {
  logger.info("Collecting analytic data");

  if (page) {
    return collectEvents(analytics.getPageDto(analyticsId, page));
  }

  return Promise.all([
    analytics.getListDto(analyticsId).map((dto) => collectEvents(dto)),
  ]).then(flattenPromise);
};
