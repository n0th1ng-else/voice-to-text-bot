import { init as initAmplitude } from "@amplitude/node";

import { AnalyticsEventExt } from "../v4/types";
import { Logger } from "../../logger";
import { amplitudeToken } from "../../env";

const logger = new Logger("analytics:amplitude");

export const collectEvents = (chatId: number, events: AnalyticsEventExt[]) => {
  if (!amplitudeToken) {
    logger.error(
      "Amplitude analytics token is not provided!",
      new Error("Amplitude analytics token is not provided")
    );
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => {
      const client = initAmplitude(amplitudeToken);

      return Promise.all(
        events.map((event) =>
          client.logEvent({
            event_type: event.name,
            user_id: String(chatId),
            language: event.params.language,
            app_version: event.params.app_version,
            event_properties: event,
          })
        )
      );
    })
    .then(() => logger.info("Analytic data Amplitude has been collected"))
    .catch((err) =>
      logger.warn("Failed to collect analytic data Amplitude", err)
    );
};
