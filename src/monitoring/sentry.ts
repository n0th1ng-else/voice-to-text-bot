import type { Express } from "express";
import {
  init as initSentryGlobal,
  Integrations,
  Handlers,
  autoDiscoverNodePerformanceMonitoringIntegrations,
  captureException,
  getCurrentScope,
  runWithAsyncContext,
} from "@sentry/node";
import type { FastifyInstance } from "fastify";
import { ProfilingIntegration } from "@sentry/profiling-node";
import { appVersion, nodeEnvironment, sentryDsn } from "../env.js";
import { isDevelopment } from "../common/environment.js";

const isEnabled = (): boolean => {
  return Boolean(sentryDsn);
};

export const initSentry = (app: Express): void => {
  if (!isEnabled()) {
    return;
  }
  initSentryGlobal({
    dsn: sentryDsn,
    environment: nodeEnvironment,
    release: appVersion,
    integrations: [
      // enable HTTP calls tracing
      new Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Integrations.Express({ app }),
      // Automatically instrument Node.js libraries and frameworks
      ...autoDiscoverNodePerformanceMonitoringIntegrations(),
      // Add profiling
      new ProfilingIntegration(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: isDevelopment() ? 1.0 : 0.05,
    profilesSampleRate: 1.0,
  });
};

export const trackAPIHandlers = (app: Express): void => {
  if (!isEnabled()) {
    return;
  }
  // RequestHandler creates a separate execution context, so that all
  // transactions/spans/breadcrumbs are isolated across requests
  app.use(Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request
  app.use(Handlers.tracingHandler());
};

export const captureError = (err: unknown): void => {
  if (!isEnabled()) {
    return;
  }
  captureException(err);
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

    runWithAsyncContext(() => {
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

const fastifyErrorPlugin = (app: FastifyInstance): void => {
  app.addHook("onError", (_request, _reply, error, done) => {
    captureException(error);
    done();
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
      // enable HTTP calls tracing
      new Integrations.Http({ tracing: true }),
      // Automatically instrument Node.js libraries and frameworks
      ...autoDiscoverNodePerformanceMonitoringIntegrations(),
      // Add profiling
      new ProfilingIntegration(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: isDevelopment() ? 1.0 : 0.05,
    profilesSampleRate: 1.0,
  });
};

export const trackAPIHandlersNew = (app: FastifyInstance): void => {
  if (!isEnabled()) {
    return;
  }
  fastifyRequestPlugin(app);
  fastifyErrorPlugin(app);
};
