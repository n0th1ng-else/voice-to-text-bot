import { type PaymentService } from "./types.ts";

export class StripePayment implements PaymentService {
  public readonly isReady: boolean = false;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    this.isReady = Boolean(token);
  }

  public getLink(): string {
    return this.token;
  }
}
