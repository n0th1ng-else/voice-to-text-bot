import type { LanguageCode } from "../recognition/types.js";

export type PaymentService = {
  readonly isReady: boolean;

  getLink(price: number, paymentId: number, lang: LanguageCode): string;
};
