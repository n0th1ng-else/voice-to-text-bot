import type { LanguageCode } from "../../recognition/types.js";
import type { TelegramMessagePrefix } from "./messagePrefix.js";

export class BotLangData {
  public readonly langId: LanguageCode;
  public readonly prefix: TelegramMessagePrefix;

  constructor(langId: LanguageCode, prefix: TelegramMessagePrefix) {
    this.langId = langId;
    this.prefix = prefix;
  }
}
