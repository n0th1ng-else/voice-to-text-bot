import { LanguageCode } from "../recognition/types";
import { LabelId, labels } from "./labels";

export class TextModel {
  private readonly cbLang = LanguageCode.En;
  private language = LanguageCode.Ru;

  public resetLanguage() {
    this.setLanguage(this.cbLang);
  }

  public setLanguage(lang: LanguageCode) {
    this.language = lang;
  }

  public getLanguage(): LanguageCode {
    return this.language;
  }

  public t(id: LabelId): string {
    // @ts-ignore
    return labels[this.language][id] || labels[this.cbLang][id] || "";
  }
}
