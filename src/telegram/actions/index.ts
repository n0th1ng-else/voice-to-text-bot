import { StartAction } from "./start.js";
import { LangAction } from "./lang.js";
import { SupportAction } from "./support.js";
import { VoiceAction } from "./voice.js";
import { CoreAction } from "./common.js";
import { DonateAction } from "./donate.js";
import { VoiceFormatAction } from "./voice-format.js";
import { VoiceLengthAction } from "./voice-length.js";
import { TelegramButtonModel } from "../types.js";
import { Logger } from "../../logger/index.js";
import { collectAnalytics } from "../../analytics/index.js";
import { CheckoutAction } from "./checkout.js";
import { IgnoreAction } from "./ignore.js";
import { SubscriptionAction } from "./subscription.js";
import { SubscriptionChangeAction } from "./subscription-change.js";
import type { TelegramApi } from "../api/tgapi.js";
import type { PaymentService } from "../../donate/types.js";
import type { TgCallbackQuery, TgCheckoutQuery } from "../api/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";
import type { getDb } from "../../db/index.js";

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
  public readonly subscription: SubscriptionAction;
  public readonly subscriptionChange: SubscriptionChangeAction;

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
    this.subscription = new SubscriptionAction(stat, bot);
    this.subscriptionChange = new SubscriptionChangeAction(stat, bot);
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
          case "s":
            return this.subscription.runCallback(message, button, analytics);
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
