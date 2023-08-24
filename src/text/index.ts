import { labels, menuLabels } from "./labels.js";
import type { MenuLabel, LabelWithNoMenu } from "./types.js";
import type { LanguageCode } from "../recognition/types.js";

export class TextModel {
  private readonly cbLang: LanguageCode = "en-US";

  public get fallbackLanguage(): LanguageCode {
    return this.cbLang;
  }

  public t(id: LabelWithNoMenu, code: LanguageCode): string {
    return labels[code][id] || labels[this.cbLang][id] || "";
  }

  public menu(id: MenuLabel): string {
    return menuLabels[id];
  }
}
