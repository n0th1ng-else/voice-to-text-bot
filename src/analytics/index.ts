import { AnalyticsData, AnalyticsDataDto, AnalyticsHitType } from "./api/types";
import { GoogleAnalyticsApi } from "./api";
import { analyticsId } from "../env";
import { Logger } from "../logger";

const logger = new Logger("analytics");

export function collectAnalytics(analytics: AnalyticsData): Promise<void> {
  if (!analyticsId) {
    logger.error(
      "Analytics Token is not provided!",
      new Error("Analytics Token is not provided")
    );
    return Promise.resolve();
  }

  logger.info("Collecting analytic data");

  return Promise.all([
    runAnalyticsRequest(analytics.getDto(analyticsId)),
    runAnalyticsRequest(analytics.getDto(analyticsId, AnalyticsHitType.Timing)),
  ]).then(() => {
    // Flatten promise
  });
}

function runAnalyticsRequest(data: AnalyticsDataDto): Promise<void> {
  return new GoogleAnalyticsApi()
    .collect(data)
    .then(() => logger.info("Analytic data has been collected"))
    .catch((err) => logger.warn("Failed to collect analytic data", err));
}
