import TelegramBot from "node-telegram-bot-api";
import { StatisticApi } from "../../statistic";
import { StartAction } from "./start";
import { LangAction } from "./lang";
import { SupportAction } from "./support";
import { VoiceAction } from "./voice";
import { CoreAction } from "./common";

export class BotActions {
  public readonly start: StartAction;
  public readonly lang: LangAction;
  public readonly support: SupportAction;
  public readonly voice: VoiceAction;
  public readonly core: CoreAction;

  constructor(stat: StatisticApi, bot: TelegramBot) {
    this.start = new StartAction(stat, bot);
    this.lang = new LangAction(stat, bot);
    this.support = new SupportAction(stat, bot);
    this.voice = new VoiceAction(stat, bot);
    this.core = new CoreAction(stat, bot);
  }
}