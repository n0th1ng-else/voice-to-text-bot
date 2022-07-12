import axios from "axios";
import { Logger } from "../../logger";
import { AnalyticsDataDto } from "./types";
import { analyticsId } from "../../env";

const logger = new Logger("analytics");

export const collectEvents = (data: AnalyticsDataDto): Promise<void> => {
  if (!analyticsId) {
    logger.error(
      "Analytics Token is not provided!",
      new Error("Analytics Token is not provided")
    );
    return Promise.resolve();
  }

  const timeout = 10_000;
  const logged = { ul: data.ul, cid: data.cid, uid: data.uid, t: data.t };

  const url = new URL("https://www.google-analytics.com/collect");
  Object.keys(data).forEach((key) => {
    url.searchParams.set(key, data[key]);
  });

  return axios
    .request({
      method: "GET",
      url: url.toString(),
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
