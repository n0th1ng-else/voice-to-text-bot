import { AnalyticsData, AnalyticsDataDto } from "./api/types";
import { GoogleAnalyticsApi } from "./api";
import { analyticsId } from "../env";
import { Logger } from "../logger";
import { flattenPromise } from "../common/helpers";

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
    analytics.getListDto(analyticsId).map((dto) => runAnalyticsRequest(dto)),
  ]).then(flattenPromise);
}

function runAnalyticsRequest(data: AnalyticsDataDto): Promise<void> {
  // const logged = { ...data, tid: "hidden" }; // Log event
  return new GoogleAnalyticsApi()
    .collect(data)
    .then(() => logger.info("Analytic data has been collected"))
    .catch((err) => logger.warn("Failed to collect analytic data", err));
}
