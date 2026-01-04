import { SentryBase } from "./sentry-base.js";

/**
 * Dummy Sentry client used to mock sentry in tests
 */
export class SentryDummyClient extends SentryBase {
  public init(): void {
    return;
  }

  public captureException(): void {
    return;
  }

  public captureMessage(): void {
    return;
  }

  public addAttachment(): void {
    return;
  }

  public setMetadataAndTags(): void {
    return;
  }
}
