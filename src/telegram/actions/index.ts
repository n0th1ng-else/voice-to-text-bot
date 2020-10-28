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
import { PaymentService } from "../../donate/types";
import { TgCallbackQuery } from "../api/types";
import { AnalyticsData } from "../../analytics/api/types";
import { TelegramButtonModel, TelegramButtonType } from "../types";
import { Logger } from "../../logger";
import { collectAnalytics } from "../../analytics";

const logger = new Logger("telegram-bot");

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

  public setPayment(payment: PaymentService): void {
    this.fund.setPayment(payment);
  }

  public handleCallback(
    msg: TgCallbackQuery,
    analytics: AnalyticsData
  ): Promise<void> {
    const message = msg.message;
    const data = msg.data;

    if (!message) {
      const errorMessage = "No message passed in callback query";
      const msgError = new Error(errorMessage);
      logger.error(msgError.message, msgError);
      analytics.setError(errorMessage);
      return collectAnalytics(analytics.setCommand("Callback query"));
    }

    if (!data) {
      const errorMessage = "No data passed in callback query";
      const msgError = new Error(errorMessage);
      logger.error(msgError.message, msgError);
      analytics.setError(errorMessage);
      return collectAnalytics(analytics.setCommand("Callback query"));
    }

    return Promise.resolve()
      .then(() => {
        const button = TelegramButtonModel.fromDto(data);

        switch (button.id) {
          case TelegramButtonType.Donation:
            return this.fund.runCallback(message, button, analytics);
          case TelegramButtonType.Language:
            return this.lang.runCallback(message, button, analytics, msg);
          default:
            throw new Error("Unknown type passed in callback query");
        }
      })
      .catch((err) => {
        const errorMessage = "Failed to execute callback query";
        logger.error(errorMessage, err);
        analytics.setError(errorMessage);
        return collectAnalytics(analytics.setCommand("Callback query"));
      });
  }
}
