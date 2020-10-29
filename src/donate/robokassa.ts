import { getMd5Hash } from "../common/hash";
import { TextModel } from "../text";
import { LabelId } from "../text/labels";
import { LanguageCode } from "../recognition/types";
import { PaymentService } from "./types";

export class RobokassaPayment implements PaymentService {
  private readonly url = "https://auth.robokassa.ru/Merchant/Index.aspx";
  private readonly currency = "USD";
  private readonly encoding = "UTF-8";

  public readonly isReady: boolean = false;

  constructor(
    private readonly login: string,
    private readonly passwordForSend: string,
    private readonly isTestMode = true
  ) {
    this.isReady = !!(this.login && this.passwordForSend);
  }

  public getLink(price: number, paymentId: number, lang: LanguageCode): string {
    const signature = getMd5Hash(
      this.login,
      price,
      paymentId,
      this.currency,
      this.passwordForSend
    );

    const text = new TextModel();
    const description = text.t(LabelId.PaymentDescription, lang);
    const expirationDate = this.addMinutes(30);

    const params: string[] = [];
    params.push(`OutSum=${encodeURIComponent(price)}`);
    params.push(`OutSumCurrency=${encodeURIComponent(this.currency)}`);
    params.push(`InvId=${encodeURIComponent(paymentId)}`);
    params.push(`MerchantLogin=${encodeURIComponent(this.login)}`);
    params.push(`Encoding=${encodeURIComponent(this.encoding)}`);
    params.push(`Culture=${encodeURIComponent(lang)}`);
    params.push(
      `ExpirationDate=${encodeURIComponent(expirationDate.toISOString())}`
    );
    params.push(`SignatureValue=${encodeURIComponent(signature)}`);
    params.push(`Description=${encodeURIComponent(description)}`);

    if (this.isTestMode) {
      params.push(`IsTest=${this.isTestMode ? "1" : "0"}`);
    }

    return `${this.url}?${params.join("&")}`;
  }

  private addMinutes(minutes: number): Date {
    return new Date(new Date().getTime() + minutes * 60000);
  }
}
