import { SentryBase } from "./sentry-base.js";

/**
 * Dummy Sentry client used to mock sentry in tests
 */
export class SentryDummyClient extends SentryBase {
  init(): void {
    return;
  }

  captureException(): void {
    return;
  }

  captureMessage(): void {
    return;
  }

  addAttachment(): void {
    return;
  }

  setMetadata(): void {
    return;
  }
}
