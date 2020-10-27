import { LanguageCode } from "../recognition/types";

export interface PaymentService {
  getLink(price: number, paymentId: number, lang: LanguageCode): string;
}
