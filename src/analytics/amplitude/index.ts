import { init as initAmplitude } from "@amplitude/node";
import { customAlphabet } from "nanoid";
import type { AnalyticsEventExt } from "../ga/types.js";
import { Logger } from "../../logger/index.js";
import { amplitudeToken } from "../../env.js";
import { isDevelopment } from "../../common/environment.js";
import type { ChatId } from "../../telegram/api/core.js";

const logger = new Logger("analytics:amplitude");

export const collectEvents = async (
  chatId: ChatId | "system_executor",
  events: AnalyticsEventExt[],
) => {
  if (!amplitudeToken) {
    if (!isDevelopment()) {
      logger.error(
        "Amplitude Analytics Token is not provided!",
        new Error("Amplitude Analytics Token is not provided"),
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
        logger.warn(
          "Session id is not a number, got string",
          {
            sessionIdStr,
          },
          true,
        );
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
    .then(() => {
      logger.debug("Analytic data Amplitude has been collected");
    })
    .catch((err) => {
      logger.error("Failed to collect analytic data Amplitude", err);
    });
};
