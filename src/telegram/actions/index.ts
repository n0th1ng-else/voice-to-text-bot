import { StartAction } from "./start.ts";
import { LangAction } from "./lang.ts";
import { SupportAction } from "./support.ts";
import { VoiceAction } from "./voice.ts";
import { CoreAction } from "./common.ts";
import { DonateAction } from "./donate.ts";
import { VoiceFormatAction } from "./voice-format.ts";
import { VoiceLengthAction } from "./voice-length.ts";
import { TelegramButtonModel } from "../types.ts";
import { Logger } from "../../logger/index.ts";
import { collectAnalytics } from "../../analytics/index.ts";
import { CheckoutAction } from "./checkout.ts";
import { IgnoreAction } from "./ignore.ts";
import type { TelegramApi } from "../api/tgapi.ts";
import type { PaymentService } from "../../donate/types.ts";
import type { TgCallbackQuery, TgCheckoutQuery } from "../api/types.ts";
import type { AnalyticsData } from "../../analytics/ga/types.ts";
import type { getDb } from "../../db/index.ts";

const logger = new Logger("telegram-bot");

export class BotActions {
  public readonly start: StartAction;
  public readonly lang: LangAction;
  public readonly support: SupportAction;
  public readonly voice: VoiceAction;
  public readonly core: CoreAction;
  public readonly donate: DonateAction;
  public readonly voiceFormat: VoiceFormatAction;
  public readonly voiceLength: VoiceLengthAction;
  public readonly checkout: CheckoutAction;
  public readonly ignore: IgnoreAction;

  constructor(stat: ReturnType<typeof getDb>, bot: TelegramApi) {
    this.start = new StartAction(stat, bot);
    this.lang = new LangAction(stat, bot);
    this.support = new SupportAction(stat, bot);
    this.voice = new VoiceAction(stat, bot);
    this.core = new CoreAction(stat, bot);
    this.donate = new DonateAction(stat, bot);
    this.voiceFormat = new VoiceFormatAction(stat, bot);
    this.voiceLength = new VoiceLengthAction(stat, bot);
    this.checkout = new CheckoutAction(stat, bot);
    this.ignore = new IgnoreAction(stat, bot);
  }

  public setPayment(payment: PaymentService): void {
    this.donate.setPayment(payment);
  }

  public async handleCallback(
    msg: TgCallbackQuery,
    analytics: AnalyticsData,
  ): Promise<void> {
    const message = msg.message;
    const data = msg.data;

    if (!message) {
      const errorMessage = "No message passed in callback query";
      const msgError = new Error(errorMessage);
      logger.error(msgError.message, msgError);
      analytics.addError(errorMessage);
      return collectAnalytics(
        analytics.setCommand("/app", "Callback query error", "No message"),
      );
    }

    if (!data) {
      const errorMessage = "No data passed in callback query";
      const msgError = new Error(errorMessage);
      logger.error(msgError.message, msgError);
      analytics.addError(errorMessage);
      return collectAnalytics(
        analytics.setCommand("/app", "Callback query error", "No data"),
      );
    }

    return Promise.resolve()
      .then(() => {
        const button = TelegramButtonModel.fromDto(data);

        switch (button.id) {
          case "d":
            return this.donate.runCallback(message, button, analytics);
          case "l":
            return this.lang.runCallback(message, button, analytics, msg);
          default:
            throw new Error(`Unknown type passed in callback query ${data}`, {
              cause: data,
            });
        }
      })
      .catch((err) => {
        const errorMessage = "Failed to execute callback query";
        logger.error(errorMessage, err);
        analytics.addError(errorMessage);
        return collectAnalytics(
          analytics.setCommand("/app", "Callback query error", "Unknown"),
        );
      });
  }

  public handleCheckout(
    msg: TgCheckoutQuery,
    analytics: AnalyticsData,
  ): Promise<void> {
    return this.checkout.confirmCheckout(msg, analytics);
  }
}
