import { TgInlineKeyboardButton, TgMessage } from "../api/types";
import { GenericAction } from "./common";
import {
  BotCommand,
  BotMessageModel,
  TelegramButtonModel,
  TelegramButtonType,
  TelegramMessagePrefix,
} from "../types";
import { getDonationDtoString, isFundMessage } from "../helpers";
import { LabelId } from "../../text/labels";
import { Logger } from "../../logger";
import { collectAnalytics, collectPageAnalytics } from "../../analytics";
import { PaymentService } from "../../donate/types";
import { AnalyticsData } from "../../analytics/legacy/types";
import { LanguageCode } from "../../recognition/types";
import { BOT_LOGO, donationLevels } from "../../const";
import { TextModel } from "../../text";

const logger = new Logger("telegram-bot");

export class FundAction extends GenericAction {
  private payment?: PaymentService;

  public runAction(
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
        const donations = donationLevels.map((level) =>
          FundAction.getDonationButton(level.amount, prefix.id, level.meta)
        );

        const buttons: TgInlineKeyboardButton[][] = [];
        buttons.push(donations);

        return this.sendMessage(
          model.id,
          model.chatId,
          LabelId.FundCommandMessage,
          {
            lang,
            options: buttons,
          },
          prefix,
          model.forumThreadId
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
      logger.error(
        `${prefix.getPrefix()} ${errorMessage}`,
        new Error("Price is not a number")
      );
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
          logger.error(
            `${prefix.getPrefix()} ${errorMessage}`,
            new Error("Payment service is not set")
          );
          model.analytics.setError(errorMessage);
          return collectAnalytics(
            model.analytics.setCommand(
              BotCommand.Fund,
              "Fund message error",
              "Payment service is not set"
            )
          );
        }

        const token = this.payment.getLink(price, donationId, lang);

        return this.sendInvoice(
          model.chatId,
          price,
          donationId,
          token,
          lang,
          prefix,
          model.forumThreadId
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
      text: TextModel.toCurrency(price, emoji),
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
        throw err;
      });
  }

  private sendInvoice(
    chatId: number,
    amount: number,
    donationId: number,
    token: string,
    lang: LanguageCode,
    prefix: TelegramMessagePrefix,
    forumThreadId?: number
  ): Promise<void> {
    const title = this.text.t(LabelId.DonationTitle, lang);
    const description = this.text.t(LabelId.DonationDescription, lang);
    const label = this.text.t(LabelId.DonationLabel, lang);
    const photo = {
      url: BOT_LOGO,
      height: 1024,
      width: 1024,
    };
    return this.bot
      .sendInvoice(
        chatId,
        amount * 100,
        String(donationId),
        token,
        title,
        description,
        label,
        getDonationDtoString(donationId, chatId, prefix.id),
        photo,
        forumThreadId
      )
      .then(() => logger.info(`${prefix.getPrefix()} Invoice sent`))
      .catch((err) => {
        logger.error(`${prefix.getPrefix()} Unable to send the invoice`, err);
        throw err;
      });
  }
}
