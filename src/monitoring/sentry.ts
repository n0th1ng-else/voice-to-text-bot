import { Express } from "express";
import * as sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import { nodeEnvironment, sentryDsn } from "../env.js";
import { isDevelopment } from "../common/environment.js";

const isEnabled = (): boolean => {
  return Boolean(sentryDsn);
};

export const initSentry = (app: Express): void => {
  if (!isEnabled()) {
    return;
  }
  sentry.init({
    dsn: sentryDsn,
    environment: nodeEnvironment,
    integrations: [
      // enable HTTP calls tracing
      new sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new sentry.Integrations.Express({ app }),
      // Automatically instrument Node.js libraries and frameworks
      ...sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
      // Add profiling
      new ProfilingIntegration(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: isDevelopment() ? 1.0 : 0.2,
    profilesSampleRate: 1.0,
  });
};

export const trackAPIHandlers = (app: Express): void => {
  if (!isEnabled()) {
    return;
  }
  // RequestHandler creates a separate execution context, so that all
  // transactions/spans/breadcrumbs are isolated across requests
  app.use(sentry.Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request
  app.use(sentry.Handlers.tracingHandler());
};

export const captureError = (err: unknown): void => {
  if (!isEnabled()) {
    return;
  }
  sentry.captureException(err);
};
