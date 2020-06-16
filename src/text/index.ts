import { LanguageCode } from "../recognition/types";
import { LabelId, labels } from "./labels";

export class TextModel {
  private readonly cbLang = LanguageCode.En;

  public get fallbackLanguage(): LanguageCode {
    return this.cbLang;
  }

  public t(id: LabelId, code: LanguageCode): string {
    return labels[code][id] || labels[this.cbLang][id] || "";
  }
}
