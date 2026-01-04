import type { FastifyInstance } from "fastify";
import type { SentryBase } from "./sentry-base.js";
import { isNode } from "../../engines/index.js";

let sentry__singleton: SentryBase | undefined = undefined;

export const prepareSentryInstance = async (): Promise<void> => {
  if (sentry__singleton) {
    return;
  }

  if (isNode()) {
    const { SentryNodeClient } = await import("./sentry-node.js");
    sentry__singleton = new SentryNodeClient();
    return;
  }

  throw new Error("Unable to instantiate Sentry. The runtime engine is unknown");
};

export const captureError = (err: unknown): void => {
  if (!sentry__singleton) {
    throw new Error("Sentry is not initialized");
  }
  sentry__singleton.captureException(err);
};

export const captureWarning = (message: string, context?: Record<string, unknown>): void => {
  if (!sentry__singleton) {
    throw new Error("Sentry is not initialized");
  }

  sentry__singleton.captureMessage(message, {
    level: "warning",
    extra: context,
  });
};

export const addAttachment = (filename: string, data: string | Uint8Array): void => {
  if (!sentry__singleton) {
    throw new Error("Sentry is not initialized");
  }

  sentry__singleton.addAttachment(filename, data);
};

export const initSentry = (app: FastifyInstance): void => {
  if (!sentry__singleton) {
    throw new Error("Sentry is not initialized");
  }

  sentry__singleton.init(app);
};
