import { TelegramApi } from "../api";
import { StartAction } from "./start";
import { LangAction } from "./lang";
import { SupportAction } from "./support";
import { VoiceAction } from "./voice";
import { CoreAction } from "./common";
import { FundAction } from "./fund";
import { VoiceFormatAction } from "./voice-format";
import { VoiceLengthAction } from "./voice-length";
import { DbClient } from "../../db";

export class BotActions {
  public readonly start: StartAction;
  public readonly lang: LangAction;
  public readonly support: SupportAction;
  public readonly voice: VoiceAction;
  public readonly core: CoreAction;
  public readonly fund: FundAction;
  public readonly voiceFormat: VoiceFormatAction;
  public readonly voiceLength: VoiceLengthAction;

  constructor(stat: DbClient, bot: TelegramApi) {
    this.start = new StartAction(stat, bot);
    this.lang = new LangAction(stat, bot);
    this.support = new SupportAction(stat, bot);
    this.voice = new VoiceAction(stat, bot);
    this.core = new CoreAction(stat, bot);
    this.fund = new FundAction(stat, bot);
    this.voiceFormat = new VoiceFormatAction(stat, bot);
    this.voiceLength = new VoiceLengthAction(stat, bot);
  }
}
