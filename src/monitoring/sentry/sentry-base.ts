import type { FastifyInstance } from "fastify";
import { appVersion, nodeEnvironment, sentryDsn } from "../../env.js";
import { fetchPropFromUnknown } from "../../common/unknown.js";
import { isDevelopment } from "../../common/environment.js";
import type { VoidFunction } from "../../common/types.js";

export type SentryMetadata = {
  url?: string;
  method?: string;
  userId?: unknown;
  chatId?: unknown;
};

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
  protected abstract setMetadataAndTags(
    meta: SentryMetadata,
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
    app.addHook("preHandler", (request, _reply, done) => {
      const { routeOptions, body } = request;
      /**
       * @see https://github.com/getsentry/sentry-javascript/pull/9138/files
       */
      const requestMessage = fetchPropFromUnknown(body, "message", {});
      const requestUserId = fetchPropFromUnknown<string>(
        fetchPropFromUnknown(requestMessage, "from", {}),
        "id",
        "",
      );
      const requestChatId = fetchPropFromUnknown<string>(
        fetchPropFromUnknown(requestMessage, "chat", {}),
        "id",
        "",
      );

      this.setMetadataAndTags(
        {
          url: routeOptions.url,
          method: Array.isArray(routeOptions.method)
            ? routeOptions.method.at(0)
            : routeOptions.method,
          userId: requestUserId,
          chatId: requestChatId,
        },
        {
          "tg.userId": requestUserId,
          "tg.chatId": requestChatId,
        },
        done,
      );
    });
  }

  protected beforeSentrySend = <E extends { tags?: Record<string, unknown> }>(
    event: E,
    hint: { originalException?: unknown },
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
}
