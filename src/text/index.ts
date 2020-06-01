import { LanguageCode } from "../recognition/types";
import { LabelId, labels } from "./labels";

export class TextModel {
  private readonly cbLang = LanguageCode.En;
  private language = LanguageCode.Ru;

  public resetLanguage(): void {
    this.setLanguage(this.cbLang);
  }

  public setLanguage(lang: LanguageCode): void {
    this.language = lang;
  }

  public getLanguage(): LanguageCode {
    return this.language;
  }

  public t(id: LabelId): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return labels[this.language][id] || labels[this.cbLang][id] || "";
  }
}
