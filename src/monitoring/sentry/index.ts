import type { FastifyInstance } from "fastify";
import type { SentryBase } from "./sentry-base.js";
import { isNode } from "../../engines/index.js";

let instance: SentryBase | undefined;

export const prepareSentryInstance = async (): Promise<void> => {
  if (instance) {
    return;
  }

  if (isNode()) {
    const { SentryNode } = await import("./sentry-node.js");
    instance = new SentryNode();
    return;
  }

  throw new Error("Unable to instantiate Sentry. The runtime engine is unknown");
};

export const captureError = (err: unknown): void => {
  if (!instance) {
    throw new Error("Sentry is not initialized");
  }
  instance.captureException(err);
};

export const captureWarning = (message: string, context?: Record<string, unknown>): void => {
  if (!instance) {
    throw new Error("Sentry is not initialized");
  }

  instance.captureMessage(message, {
    level: "warning",
    extra: context,
  });
};

export const addAttachment = (filename: string, data: string | Uint8Array): void => {
  if (!instance) {
    throw new Error("Sentry is not initialized");
  }

  instance.addAttachment(filename, data);
};

export const initSentry = (app: FastifyInstance): void => {
  if (!instance) {
    throw new Error("Sentry is not initialized");
  }

  instance.init(app);
};
