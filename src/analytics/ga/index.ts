import { Logger } from "../../logger/index.js";
import { type AnalyticsEventExt, EVENTS_LIMIT_GA } from "./types.js";
import { analytics } from "../../env.js";
import { isDevelopment } from "../../common/environment.js";
import type { ChatId } from "../../telegram/api/core.js";
import { API_TIMEOUT_MS } from "../../const.js";

const logger = new Logger("analytics:ga");

export const collectEvents = async (chatId: ChatId, events: AnalyticsEventExt[]): Promise<void> => {
  if (!analytics.measurementId || !analytics.apiSecret) {
    if (!isDevelopment()) {
      logger.error(
        "Google analytics Token is not provided!",
        new Error("Google analytics Token is not provided"),
      );
    }
    return;
  }

  const isTooManyEvents = events.length > EVENTS_LIMIT_GA;
  if (isTooManyEvents) {
    logger.warn("Too many events to send for analytics", {}, true);
  }

  try {
    const url = new URL("https://www.google-analytics.com/mp/collect");
    url.searchParams.set("api_secret", analytics.apiSecret);
    url.searchParams.set("measurement_id", analytics.measurementId);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: String(chatId),
        user_id: String(chatId),
        non_personalized_ads: true,
        events,
      }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GA request failed: ${res.status} ${text}`);
    }

    logger.debug("Analytic data ga has been collected");
  } catch (err) {
    logger.error("Failed to collect analytic data ga", err);
  }
};
