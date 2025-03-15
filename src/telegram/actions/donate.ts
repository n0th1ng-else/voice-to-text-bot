import { GenericAction } from "./common.js";
import {
  BotCommand,
  BotMessageModel,
  TelegramButtonModel,
  TelegramMessagePrefix,
} from "../types.js";
import {
  getBotLogo,
  getDonationDtoString,
  isCommandMessage,
} from "../helpers.js";
import { TranslationKeys } from "../../text/types.js";
import { Logger } from "../../logger/index.js";
import { collectAnalytics } from "../../analytics/index.js";
import { donationLevels } from "../../const.js";
import { toCurrency } from "../../text/utils.js";
import type { TgMessage } from "../api/types.js";
import type { PaymentService } from "../../donate/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";
import type { LanguageCode } from "../../recognition/types.js";
import type { ChatId, MessageThreadId } from "../api/core.js";
import type { TgInlineKeyboardButton } from "../api/groups/chats/chats-types.js";

const getDonateButton = (
  price: number,
  logPrefix: string,
): TelegramButtonModel => {
  return new TelegramButtonModel<string>("d", `${price}`, logPrefix);
};

const logger = new Logger("telegram-bot");

export class DonateAction extends GenericAction {
  private payment?: PaymentService;

  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    return this.sendDonateMessage(mdl, prefix);
  }

  public async runCondition(
    msg: TgMessage,
    mdl: BotMessageModel,
  ): Promise<boolean> {
    const isDonateMessage = isCommandMessage(mdl, msg, BotCommand.Donate);
    return Promise.resolve(isDonateMessage);
  }

  public async runCallback(
    msg: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData,
  ): Promise<void> {
    analytics.addPageVisit();
    return this.formLinkButton(msg, button, analytics);
  }

  public setPayment(payment: PaymentService): void {
    if (!payment.isReady) {
      return;
    }

    this.payment = payment;
  }

  private async sendDonateMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending donate message`);

    return this.getChatLanguage(model, prefix)
      .then((lang) => {
        const donations = donationLevels.map((level) =>
          DonateAction.getDonationButton(level.amount, prefix.id, level.meta),
        );

        const buttons: TgInlineKeyboardButton[][] = [];
        buttons.push(donations);

        return this.sendMessage(
          model.chatId,
          [TranslationKeys.DonateCommandMessage],
          {
            lang,
            options: { buttons },
          },
          prefix,
          model.forumThreadId,
        );
      })
      .then(() => logger.info(`${prefix.getPrefix()} Donate message sent`))
      .catch((err) => {
        const errorMessage = "Unable to send donate message";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand(
            BotCommand.Donate,
            "Donate message",
            "Init",
          ),
        ),
      );
  }

  private async formLinkButton(
    msg: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData,
  ): Promise<void> {
    const model = new BotMessageModel(msg, analytics);
    const prefix = new TelegramMessagePrefix(model.chatId, button.logPrefix);
    const price = Number(button.value);

    if (!price) {
      const errorMessage = `Price is not a number, got ${button.value}`;
      logger.error(
        `${prefix.getPrefix()} ${errorMessage}`,
        new Error("Price is not a number"),
      );
      model.analytics.addError(errorMessage);
      return collectAnalytics(
        model.analytics.setCommand(
          BotCommand.Donate,
          "Donate message error",
          "Price is not specified",
        ),
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
            new Error("Payment service is not set"),
          );
          model.analytics.addError(errorMessage);
          return collectAnalytics(
            model.analytics.setCommand(
              BotCommand.Donate,
              "Donate message error",
              "Payment service is not set",
            ),
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
          model.forumThreadId,
        );
      })
      .catch((err) => {
        logger.error(
          `${prefix.getPrefix()} Unable to send the donations link`,
          err,
        );
      });
  }

  private static getDonationButton(
    price: number,
    logId: string,
    emoji: string,
  ): TgInlineKeyboardButton {
    const btn = getDonateButton(price, logId);
    return {
      text: toCurrency(price, emoji),
      callback_data: btn.getDtoString(),
    };
  }

  private getDonationId(
    model: BotMessageModel,
    price: number,
    prefix: TelegramMessagePrefix,
  ): Promise<number> {
    return this.stat
      .createDonationRow(model.chatId, price)
      .then((row) => this.stat.getDonationId(row))
      .catch((err) => {
        const errorMessage = `Unable to create donationId for price=${price}`;
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
        throw err;
      });
  }

  private sendInvoice(
    chatId: ChatId,
    amount: number,
    donationId: number,
    token: string,
    lang: LanguageCode,
    prefix: TelegramMessagePrefix,
    forumThreadId?: MessageThreadId,
  ): Promise<void> {
    const title = this.text.t(TranslationKeys.DonationTitle, lang);
    const description = this.text.t(TranslationKeys.DonationDescription, lang);
    const label = this.text.t(TranslationKeys.DonationLabel, lang);

    const invoice = {
      chatId,
      amount: amount * 100,
      meta: String(donationId),
      token,
      title,
      description,
      label,
      payload: getDonationDtoString(donationId, chatId, prefix.id),
      photo: getBotLogo(),
      forumThreadId,
    };
    return this.bot.payments
      .sendInvoice(invoice)
      .then(() => logger.info(`${prefix.getPrefix()} Invoice sent`))
      .catch((err) => {
        logger.error(`${prefix.getPrefix()} Unable to send the invoice`, err);
        throw err;
      });
  }
}
