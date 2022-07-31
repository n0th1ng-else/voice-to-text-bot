import { LanguageCode } from "../recognition/types";
import { LabelId, labels, MenuLabel, menuLabels } from "./labels";

export const sSuffix = (word: string, count: number | boolean): string => {
  const isNumber = typeof count === "number";
  const isSingleChecker = isNumber ? count === 1 : !count;
  const suffix = isSingleChecker ? "" : "s";
  const prefix = !isNumber ? "" : `${count} `;
  return `${prefix}${word}${suffix}`;
};

export class TextModel {
  private readonly cbLang = LanguageCode.En;

  public static toCurrency(amount: number, meta?: string): string {
    const amountStr = `${amount} €`;
    return meta ? `${amountStr}  ${meta}` : amountStr;
  }

  public get fallbackLanguage(): LanguageCode {
    return this.cbLang;
  }

  public t(id: LabelId, code: LanguageCode): string {
    return labels[code][id] || labels[this.cbLang][id] || "";
  }

  public menu(id: MenuLabel): string {
    return menuLabels[id];
  }
}
