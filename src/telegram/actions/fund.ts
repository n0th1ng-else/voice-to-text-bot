import { TgInlineKeyboardButton, TgMessage } from "../api/types";
import { GenericAction } from "./common";
import {
  BotCommand,
  BotMessageModel,
  TelegramButtonModel,
  TelegramButtonType,
  TelegramMessagePrefix,
} from "../types";
import { isFundMessage } from "../helpers";
import { LabelId } from "../../text/labels";
import { patreonAccount, yandexAccount } from "../../const";
import { Logger } from "../../logger";
import { collectAnalytics, collectPageAnalytics } from "../../analytics";
import { PaymentService } from "../../donate/types";
import { AnalyticsData } from "../../analytics/legacy/types";

const logger = new Logger("telegram-bot");

export class FundAction extends GenericAction {
  private payment?: PaymentService;

  public runAction(
    msg: TgMessage,
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    collectPageAnalytics(mdl.analytics, BotCommand.Fund);
    mdl.analytics.v4.addPageVisit();
    return this.sendFundMessage(mdl, prefix);
  }

  public runCondition(msg: TgMessage, mdl: BotMessageModel): boolean {
    return isFundMessage(mdl, msg);
  }

  public runCallback(
    msg: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData
  ): Promise<void> {
    collectPageAnalytics(analytics, BotCommand.Fund);
    analytics.v4.addPageVisit();
    return this.formLinkButton(msg, button, analytics);
  }

  public setPayment(payment: PaymentService): void {
    if (!payment.isReady) {
      return;
    }

    this.payment = payment;
  }

  private sendFundMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending fund message`);

    return this.getChatLanguage(model, prefix)
      .then((lang) => {
        const patreonBtn: TgInlineKeyboardButton = {
          text: this.text.t(LabelId.PatreonLinkTitle, lang),
          url: patreonAccount,
        };

        const yandexBtn: TgInlineKeyboardButton = {
          text: this.text.t(LabelId.YandexLinkTitle, lang),
          url: yandexAccount,
        };

        const usd5 = FundAction.getDonationButton(5, prefix.id, "😎");
        const usd7 = FundAction.getDonationButton(7, prefix.id, "👑");
        const usd10 = FundAction.getDonationButton(10, prefix.id, "‍🚀");
        const donations = [usd5, usd7, usd10];

        const buttons: TgInlineKeyboardButton[][] = [];
        if (this.payment) {
          buttons.push(donations);
        }

        buttons.push([yandexBtn]);
        buttons.push([patreonBtn]);

        return this.sendMessage(
          model.id,
          model.chatId,
          LabelId.FundCommandMessage,
          {
            lang,
            options: buttons,
          },
          prefix
        );
      })
      .then(() => logger.info(`${prefix.getPrefix()} Fund message sent`))
      .catch((err) => {
        const errorMessage = "Unable to send fund message";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.setError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand(BotCommand.Fund, "Fund message", "Init")
        )
      );
  }

  private formLinkButton(
    msg: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData
  ): Promise<void> {
    const model = new BotMessageModel(msg, analytics);
    const prefix = new TelegramMessagePrefix(model.chatId, button.logPrefix);
    const price = Number(button.value);

    if (!price) {
      const errorMessage = `Price is not a number, got ${button.value}`;
      logger.error(`${prefix.getPrefix()} ${errorMessage}`);
      model.analytics.setError(errorMessage);
      return collectAnalytics(
        model.analytics.setCommand(
          BotCommand.Fund,
          "Fund message error",
          "Price is not specified"
        )
      );
    }

    return Promise.all([
      this.getChatLanguage(model, prefix),
      this.getDonationId(model, price, prefix),
    ])
      .then(([lang, donationId]) => {
        if (!this.payment) {
          const errorMessage = "Payment service is not set for callback query";
          logger.error(`${prefix.getPrefix()} ${errorMessage}`);
          model.analytics.setError(errorMessage);
          return collectAnalytics(
            model.analytics.setCommand(
              BotCommand.Fund,
              "Fund message error",
              "Payment service is not set"
            )
          );
        }

        const link = this.payment.getLink(price, donationId, lang);

        const payBtn: TgInlineKeyboardButton = {
          text: this.text.t(LabelId.PaymentLinkButton, lang),
          url: link,
        };

        return this.editMessage(
          model.chatId,
          msg.message_id,
          { lang, options: [[payBtn]] },
          LabelId.PaymentLink,
          prefix
        );
      })
      .catch((err) => {
        logger.error(
          `${prefix.getPrefix()} Unable to send the donations link`,
          err
        );
      });
  }

  private static getDonationButton(
    price: number,
    logId: string,
    emoji: string
  ): TgInlineKeyboardButton {
    return {
      text: `${price}$ ${emoji}`,
      callback_data: new TelegramButtonModel(
        TelegramButtonType.Donation,
        `${price}`,
        logId
      ).getDtoString(),
    };
  }

  private getDonationId(
    model: BotMessageModel,
    price: number,
    prefix: TelegramMessagePrefix
  ): Promise<number> {
    return this.stat.donations
      .createRow(model.chatId, price)
      .then((row) => this.stat.donations.getRowId(row))
      .catch((err) => {
        const errorMessage = `Unable to create donationId for price=${price}`;
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.setError(errorMessage);
        const fallbackDonationId = 9999;
        return fallbackDonationId;
      });
  }
}
