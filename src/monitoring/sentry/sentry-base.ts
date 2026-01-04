import type { FastifyInstance } from "fastify";
import { appVersion, nodeEnvironment, sentryDsn } from "../../env.js";

export type SentryMetadata = {
  url?: string;
  method?: string;
  userId?: unknown;
  chatId?: unknown;
};

/**
 * @see https://github.com/getsentry/sentry-javascript/pull/9138/files
 */
const fetchPropFromUnknown = <T>(obj: unknown, prop: string, defaultVal: T): unknown => {
  // @ts-expect-error Sometimes we need this JS spice
  return obj && typeof obj === "object" && prop in obj ? obj[prop] : defaultVal;
};

export abstract class SentryBase {
  protected readonly appVersion = appVersion;
  protected readonly nodeEnvironment = nodeEnvironment;
  protected readonly sentryDsn = sentryDsn;
  protected readonly cancelledErrorRateLimit = 10; // report only 10% of "EWITAI canceled" errors
  protected cancelledErrorRateCount = 0;

  abstract init(app: FastifyInstance): void;
  abstract captureException(error: unknown): void;
  abstract captureMessage(
    message: string,
    captureContext?: { level: "warning"; extra?: Record<string, unknown> },
  ): void;
  abstract addAttachment(filename: string, data: string | Uint8Array): void;
  abstract setMetadata(meta: SentryMetadata, doneFn: () => void): void;

  protected isEnabled(): boolean {
    return Boolean(this.sentryDsn);
  }

  protected captureError(err: unknown): void {
    if (!this.isEnabled()) {
      return;
    }

    this.captureException(err);
  }

  protected captureWarning(message: string, context?: Record<string, unknown>): void {
    if (!this.isEnabled()) {
      return;
    }

    this.captureMessage(message, {
      level: "warning",
      extra: context,
    });
  }

  protected setFastifyRequestPlugin(app: FastifyInstance): void {
    app.addHook("preHandler", (request, _reply, done) => {
      const { routeOptions, body } = request;
      const requestUserId = fetchPropFromUnknown(
        fetchPropFromUnknown(fetchPropFromUnknown(body, "message", 0), "from", 0),
        "id",
        0,
      );
      const requestChatId = fetchPropFromUnknown(
        fetchPropFromUnknown(fetchPropFromUnknown(body, "message", 0), "chat", 0),
        "id",
        0,
      );

      this.setMetadata(
        {
          url: routeOptions.url,
          method: Array.isArray(routeOptions.method)
            ? routeOptions.method.at(0)
            : routeOptions.method,
          userId: requestUserId,
          chatId: requestChatId,
        },
        done,
      );
    });
  }
}

const ERROR_RATE_LIMIT = 10; // report only 10% of "EWITAI canceled" errors
let ERROR_RATE_COUNT = 0;

export const beforeSentrySend = <E>(event: E, hint: { originalException?: unknown }): E | null => {
  const error = hint.originalException;

  if (!error || typeof error !== "object") {
    return event;
  }

  const message = "message" in error && error.message;

  if (message === "EWITAI canceled") {
    ERROR_RATE_COUNT = ERROR_RATE_COUNT + 1;

    if (ERROR_RATE_COUNT > ERROR_RATE_LIMIT) {
      ERROR_RATE_COUNT = 0;
      return event;
    }

    return null;
  }

  return event;
};
