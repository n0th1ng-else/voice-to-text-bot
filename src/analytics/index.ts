import { AnalyticsData, AnalyticsDataDto } from "./api/types";
import { GoogleAnalyticsApi } from "./api";
import { analyticsId } from "../env";
import { Logger } from "../logger";
import { flattenPromise } from "../common/helpers";
import { BotCommand } from "../telegram/types";

const logger = new Logger("analytics");

export function collectAnalytics(
  analytics: AnalyticsData,
  page?: BotCommand | "/voice"
): Promise<void> {
  if (!analyticsId) {
    logger.error(
      "Analytics Token is not provided!",
      new Error("Analytics Token is not provided")
    );
    return Promise.resolve();
  }

  logger.info("Collecting analytic data");

  if (page) {
    return runAnalyticsRequest(analytics.getPageDto(analyticsId, page));
  }

  return Promise.all([
    analytics.getListDto(analyticsId).map((dto) => runAnalyticsRequest(dto)),
  ]).then(flattenPromise);
}

function runAnalyticsRequest(data: AnalyticsDataDto): Promise<void> {
  const logged = { ul: data.ul, cid: data.cid, uid: data.uid, t: data.t };
  return new GoogleAnalyticsApi()
    .collect(data)
    .then(() => logger.info("Analytic data has been collected", logged))
    .catch((err) => logger.warn("Failed to collect analytic data", err));
}
