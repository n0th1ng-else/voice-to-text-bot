import { PaymentService } from "./types";

export class StripePayment implements PaymentService {
  public readonly isReady: boolean = false;

  constructor(private readonly token: string) {
    this.isReady = Boolean(token);
  }

  public getLink(): string {
    return this.token;
  }
}
