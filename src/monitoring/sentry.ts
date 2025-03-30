import {
  init as initSentryGlobal,
  captureException,
  captureMessage,
  getCurrentScope,
  withIsolationScope,
  setupFastifyErrorHandler,
} from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { FastifyInstance } from "fastify";
import { appVersion, nodeEnvironment, sentryDsn } from "../env.js";
import { isDevelopment } from "../common/environment.js";

const ERROR_RATE_LIMIT = 10; // report only 10% of "EWITAI canceled" errors
let ERROR_RATE_COUNT = 0;

const isEnabled = (): boolean => {
  return Boolean(sentryDsn);
};

export const initSentry = (): void => {
  if (!isEnabled()) {
    return;
  }
  initSentryGlobal({
    dsn: sentryDsn,
    environment: nodeEnvironment,
    release: appVersion,
    integrations: [
      // Add profiling
      nodeProfilingIntegration(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: isDevelopment() ? 1.0 : 0.05,
    profilesSampleRate: 1.0,
  });
};

export const captureError = (err: unknown): void => {
  if (!isEnabled()) {
    return;
  }
  captureException(err);
};

export const captureWarning = (
  message: string,
  context?: Record<string, unknown>,
): void => {
  if (!isEnabled()) {
    return;
  }

  captureMessage(message, {
    level: "warning",
    extra: context,
  });
};

export const addAttachment = (
  filename: string,
  data: string | Uint8Array,
): void => {
  getCurrentScope().addAttachment({
    filename,
    data,
    contentType: "text/plain",
  });
};

/**
 * @see https://github.com/getsentry/sentry-javascript/pull/9138/files
 */
const fetchPropFromUnknown = <T>(
  obj: unknown,
  prop: string,
  defaultVal: T,
): unknown => {
  return obj && typeof obj === "object" && prop in obj ? obj[prop] : defaultVal;
};

const fastifyRequestPlugin = (app: FastifyInstance): void => {
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

    withIsolationScope(() => {
      getCurrentScope().setSDKProcessingMetadata({
        url: routeOptions.url,
        method: routeOptions.method,
        userId: requestUserId,
        chatId: requestChatId,
      });

      done();
    });
  });
};

export const initSentryNew = (): void => {
  if (!isEnabled()) {
    return;
  }
  initSentryGlobal({
    dsn: sentryDsn,
    environment: nodeEnvironment,
    release: appVersion,
    integrations: [
      // Add profiling
      nodeProfilingIntegration(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: isDevelopment() ? 1.0 : 0.05,
    profilesSampleRate: isDevelopment() ? 1.0 : 0.2,
    sampleRate: isDevelopment() ? 1.0 : 0.5,
    beforeSend: (event, hint) => {
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
    },
  });
};

export const trackAPIHandlersNew = (app: FastifyInstance): void => {
  if (!isEnabled()) {
    return;
  }
  fastifyRequestPlugin(app);
  setupFastifyErrorHandler(app);
};
