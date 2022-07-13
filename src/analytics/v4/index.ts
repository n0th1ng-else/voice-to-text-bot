import axios from "axios";
import { Logger } from "../../logger";
import { AnalyticsEvent, EVENTS_LIMIT_GA } from "./types";
import { analytics } from "../../env";

const logger = new Logger("analytics");

export const collectEvents = (
  chatId: number,
  events: AnalyticsEvent[]
): Promise<void> => {
  if (!analytics.measurementId || !analytics.apiSecret) {
    logger.error(
      "v4 analytics Token is not provided!",
      new Error("v4 analytics Token is not provided")
    );
    return Promise.resolve();
  }

  const timeout = 10_000;
  const url = new URL("https://www.google-analytics.com/mp/collect");
  url.searchParams.set("api_secret", analytics.apiSecret);
  url.searchParams.set("measurement_id", analytics.measurementId);

  const isTooManyEvents = events.length > EVENTS_LIMIT_GA;
  if (isTooManyEvents) {
    logger.warn("Too many events to send for analytics");
  }

  return axios
    .request({
      method: "POST",
      url: url.toString(),
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
    .then(() => logger.info("Analytic data v4 has been collected"))
    .catch((err) => logger.warn("Failed to collect analytic data v4", err));
};
