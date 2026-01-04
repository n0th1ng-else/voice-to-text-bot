import {
  init as initSentryGlobal,
  captureException,
  captureMessage,
  getCurrentScope,
  withIsolationScope,
  setupFastifyErrorHandler,
  consoleLoggingIntegration,
} from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { FastifyInstance } from "fastify";
import { SentryBase, type SentryMetadata } from "./sentry-base.js";
import { isDevelopment } from "../../common/environment.js";
import type { VoidFunction } from "../../common/types.js";

export class SentryNodeClient extends SentryBase {
  public init(app: FastifyInstance): void {
    if (!this.isEnabled()) {
      return;
    }

    initSentryGlobal({
      dsn: this.sentryDsn,
      environment: this.nodeEnvironment,
      release: this.appVersion,
      enableLogs: true,
      integrations: [
        // Add profiling
        nodeProfilingIntegration(),
        consoleLoggingIntegration(),
      ],

      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: isDevelopment() ? 1.0 : 0.05,
      profilesSampleRate: isDevelopment() ? 1.0 : 0.2,
      sampleRate: isDevelopment() ? 1.0 : 0.5,
      beforeSend: (event, hint) => this.beforeSentrySend(event, hint),
    });

    this.setFastifyRequestPlugin(app);
    setupFastifyErrorHandler(app);
  }

  public captureException(error: unknown): void {
    if (!this.isEnabled()) {
      return;
    }

    captureException(error);
  }

  public captureMessage(
    message: string,
    context?: { level: "warning"; extra?: Record<string, unknown> },
  ): void {
    if (!this.isEnabled()) {
      return;
    }
    captureMessage(message, context);
  }

  public addAttachment(filename: string, data: string | Uint8Array): void {
    getCurrentScope().addAttachment({
      filename,
      data,
      contentType: "text/plain",
    });
  }

  public setMetadataAndTags(
    meta: SentryMetadata,
    tags: Record<string, string>,
    doneFn: VoidFunction,
  ): void {
    withIsolationScope(() => {
      getCurrentScope().setSDKProcessingMetadata(meta).setTags(tags);
      doneFn();
    });
  }
}
