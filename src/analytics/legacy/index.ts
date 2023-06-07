import axios from "axios";
import { Logger } from "../../logger/index.js";
import { AnalyticsDataDto } from "./types.js";
import { analyticsId } from "../../env.js";
import { isDevelopment } from "../../common/environment.js";

const logger = new Logger("analytics:ga");

export const collectEvents = (data: AnalyticsDataDto): Promise<void> => {
  if (!analyticsId) {
    if (!isDevelopment()) {
      logger.error(
        "Analytics Token is not provided!",
        new Error("Analytics Token is not provided")
      );
    }
    return Promise.resolve();
  }

  const timeout = 10_000;
  const logged = { ul: data.ul, cid: data.cid, uid: data.uid, t: data.t };

  return axios
    .request({
      method: "GET",
      url: "https://www.google-analytics.com/collect",
      params: data,
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36",
        "Content-Type": "application/json",
      },
      timeout,
      responseType: "json",
    })
    .then(() => logger.info("Analytic data has been collected", logged))
    .catch((err) => logger.warn("Failed to collect analytic data", err));
};
