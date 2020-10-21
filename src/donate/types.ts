import { LanguageCode } from "../recognition/types";

export interface PaymentService {
  readonly isReady: boolean;

  getLink(price: number, paymentId: number, lang: LanguageCode): string;
}
