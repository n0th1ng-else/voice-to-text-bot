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
import { beforeSentrySend, SentryBase, type SentryMetadata } from "./sentry-base.js";
import { isDevelopment } from "../../common/environment.js";

export class SentryNode extends SentryBase {
  init(app: FastifyInstance): void {
    if (!this.isEnabled()) {
      return;
    }

    initSentryGlobal({
      dsn: this.sentryDsn,
      environment: this.nodeEnvironment,
      release: this.appVersion,
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
      beforeSend: (event, hint) => beforeSentrySend(event, hint),
    });

    this.setFastifyRequestPlugin(app);
    setupFastifyErrorHandler(app);
  }

  captureException(error: unknown): void {
    if (!this.isEnabled()) {
      return;
    }

    captureException(error);
  }

  captureMessage(
    message: string,
    context?: { level: "warning"; extra?: Record<string, unknown> },
  ): void {
    if (!this.isEnabled()) {
      return;
    }
    captureMessage(message, context);
  }

  addAttachment(filename: string, data: string | Uint8Array): void {
    getCurrentScope().addAttachment({
      filename,
      data,
      contentType: "text/plain",
    });
  }

  setMetadata(meta: SentryMetadata, doneFn: () => void): void {
    withIsolationScope(() => {
      getCurrentScope().setSDKProcessingMetadata(meta);
      doneFn();
    });
  }
}
