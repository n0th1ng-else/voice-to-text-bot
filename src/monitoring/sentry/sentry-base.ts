import type { FastifyInstance } from "fastify";
import { appVersion, nodeEnvironment, sentryDsn } from "../../env.js";
import { fetchPropFromUnknown } from "../../common/unknown.js";
import { isDevelopment } from "../../common/environment.js";
import type { VoidFunction } from "../../common/types.js";
import { type HookMetadata, setFastifyPreHandler } from "../../server/hook.js";

// Do not include the traces from Newrelic and Amplitude to keep the tracing clean
const OMITTED_BREADCRUMBS = ["https://collector.eu01.nr-data.net/", "https://api2.amplitude.com/"];

export abstract class SentryBase {
  protected readonly appVersion = appVersion;
  protected readonly nodeEnvironment = nodeEnvironment;
  protected readonly sentryDsn = sentryDsn;
  protected readonly cancelledErrorRateLimit = 10; // report only 10% of "EWITAI canceled" errors
  protected cancelledErrorRateCount = 0;

  public abstract init(app: FastifyInstance): void;

  public abstract captureException(error: unknown): void;

  public abstract captureMessage(
    message: string,
    captureContext?: { level: "warning"; extra?: Record<string, unknown> },
  ): void;

  public abstract addAttachment(filename: string, data: string | Uint8Array): void;

  public abstract clearAttachments(): void;

  protected abstract setMetadataAndTags(
    meta: HookMetadata,
    tags: Record<string, string>,
    doneFn: VoidFunction,
  ): void;

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
    setFastifyPreHandler(app, (meta, done) => {
      this.setMetadataAndTags(
        meta,
        {
          "tg.chatId": meta.chatId || "n/a",
          "tg.userId": meta.userId || "n/a",
          "tg.userLanguage": meta.lang || "n/a",
        },
        done,
      );
    });
  }

  protected beforeSentrySend = <
    E extends { tags?: Record<string, unknown> },
    H extends { originalException?: unknown },
  >(
    event: E,
    hint: H,
  ): E | null => {
    const error = hint.originalException;

    if (!event.tags) {
      event.tags = {};
    }

    if (!error || typeof error !== "object") {
      return event;
    }

    const message = fetchPropFromUnknown<string>(error, "message", "");

    if (message === "EWITAI canceled") {
      const rateLimit = isDevelopment() ? 0 : this.cancelledErrorRateLimit;
      this.cancelledErrorRateCount = this.cancelledErrorRateCount + 1;

      if (this.cancelledErrorRateCount > rateLimit) {
        this.cancelledErrorRateCount = 0;
        return event;
      }

      return null;
    }

    return event;
  };

  protected beforeBreadcrumb<B extends { category?: string; data?: Record<string, unknown> }>(
    breadcrumb: B,
  ): B | null {
    const { category, data } = breadcrumb;
    if (["fetch", "xhr", "http"].includes(category || "")) {
      const url = typeof data?.url === "string" ? data?.url : "";
      const shouldOmit = OMITTED_BREADCRUMBS.some((host) => url.startsWith(host));
      if (shouldOmit) {
        return null;
      }
    }
    return breadcrumb;
  }
}
