import { init as initAmplitude } from "@amplitude/node";
import { customAlphabet } from "nanoid";

import { AnalyticsEventExt } from "../ga/types.js";
import { Logger } from "../../logger/index.js";
import { amplitudeToken } from "../../env.js";
import { isDevelopment } from "../../common/environment.js";

const logger = new Logger("analytics:amplitude");

export const collectEvents = (chatId: number, events: AnalyticsEventExt[]) => {
  if (!amplitudeToken) {
    if (!isDevelopment()) {
      logger.error(
        "Amplitude analytics token is not provided!",
        new Error("Amplitude analytics token is not provided"),
      );
    }
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => {
      const nanoid = customAlphabet("0123456789", 18);
      const sessionIdStr = `1${nanoid()}`;
      const sessionId = Number(sessionIdStr);

      if (isNaN(sessionId)) {
        logger.warn("Session id is not a number, got string", {
          sessionIdStr,
        });
      }
      /**
       * SessionId, 19 chars max
       */
      const eventSession = isNaN(sessionId) ? {} : { session_id: sessionId };
      const client = initAmplitude(amplitudeToken);

      return Promise.all(
        events.map((event) =>
          client.logEvent({
            event_type: event.name,
            user_id: String(chatId),
            language: event.params.language,
            app_version: event.params.app_version,
            event_properties: event,
            ...eventSession,
          }),
        ),
      );
    })
    .then(() => logger.info("Analytic data Amplitude has been collected"))
    .catch((err) =>
      logger.warn("Failed to collect analytic data Amplitude", err),
    );
};
