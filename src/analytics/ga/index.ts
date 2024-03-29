import axios from "axios";
import { Logger } from "../../logger/index.js";
import { AnalyticsEventExt, EVENTS_LIMIT_GA } from "./types.js";
import { analytics } from "../../env.js";
import { isDevelopment } from "../../common/environment.js";

const logger = new Logger("analytics:ga");

export const collectEvents = (
  chatId: number,
  events: AnalyticsEventExt[],
): Promise<void> => {
  if (!analytics.measurementId || !analytics.apiSecret) {
    if (!isDevelopment()) {
      logger.error(
        "ga analytics Token is not provided!",
        new Error("ga analytics Token is not provided"),
      );
    }
    return Promise.resolve();
  }

  const timeout = 10_000;

  const isTooManyEvents = events.length > EVENTS_LIMIT_GA;
  if (isTooManyEvents) {
    logger.warn("Too many events to send for analytics");
  }

  return axios
    .request({
      method: "POST",
      url: "https://www.google-analytics.com/mp/collect",
      params: {
        api_secret: analytics.apiSecret,
        measurement_id: analytics.measurementId,
      },
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36",
        "Content-Type": "application/json",
      },
      timeout,
      responseType: "json",
      data: {
        client_id: String(chatId),
        user_id: String(chatId),
        non_personalized_ads: true,
        events,
      },
    })
    .then(() => logger.info("Analytic data ga has been collected"))
    .catch((err) => logger.warn("Failed to collect analytic data ga", err));
};
