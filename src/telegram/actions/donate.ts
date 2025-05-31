import { GenericAction } from "./common.js";
import { TelegramButtonModel, TelegramMessagePrefix } from "../types.js";
import { BotCommand, isCommandMessage } from "../commands.js";
import { BotMessageModel } from "../model.js";
import { getBotLogo, getDonationDtoString, isStars } from "../helpers.js";
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
import {
  type Currency,
  TgCurrencySchema,
  type TgInvoice,
} from "../api/groups/payments/payments-types.js";

const getDonateButton = (
  price: number,
  currency: Currency,
  logPrefix: string,
): TelegramButtonModel => {
  const val = JSON.stringify([price, currency]);
  return new TelegramButtonModel<string>("d", val, logPrefix);
};

const parseButtonValue = (value: string): [number, Currency] => {
  const data = JSON.parse(value);
  const price = data.at(0);
  const currency = TgCurrencySchema.parse(data.at(1));
  if (typeof price !== "number" || price <= 0) {
    throw new Error("Failed to parse the donation button data");
  }

  return [price, currency];
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
        const donationStars = donationLevels.stars.map((level) =>
          DonateAction.getDonationButton(
            level.amount,
            "XTR",
            prefix.id,
            level.meta,
          ),
        );

        const donationEuros = donationLevels.euros.map((level) =>
          DonateAction.getDonationButton(
            level.amount,
            "EUR",
            prefix.id,
            level.meta,
          ),
        );

        const buttons: TgInlineKeyboardButton[][] = [];
        buttons.push(donationStars);
        buttons.push(donationEuros);

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

    try {
      const [price, currency] = parseButtonValue(button.value);
      return Promise.all([
        this.getChatLanguage(model, prefix),
        this.getDonationId(model, price, currency, prefix),
      ])
        .then(([lang, donationId]) => {
          if (!this.payment) {
            const errorMessage =
              "Payment service is not set for callback query";
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

          const token = isStars(currency)
            ? undefined
            : this.payment.getLink(price, donationId, lang);

          return this.sendInvoice(
            model.chatId,
            price,
            currency,
            donationId,
            lang,
            prefix,
            token,
            model.forumThreadId,
          );
        })
        .catch((err) => {
          logger.error(
            `${prefix.getPrefix()} Unable to send the donations link`,
            err,
          );
        });
    } catch (err) {
      const errorMessage = `Price is not a number, got ${button.value}`;
      logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
      model.analytics.addError(errorMessage);
      return collectAnalytics(
        model.analytics.setCommand(
          BotCommand.Donate,
          "Donate message error",
          "Price is not specified",
        ),
      );
    }
  }

  private static getDonationButton(
    price: number,
    currency: Currency,
    logId: string,
    emoji: string,
  ): TgInlineKeyboardButton {
    const btn = getDonateButton(price, currency, logId);
    return {
      text: isStars(currency) ? `${price} ${emoji}` : toCurrency(price, emoji),
      callback_data: btn.getDtoString(),
    };
  }

  private async getDonationId(
    model: BotMessageModel,
    price: number,
    currency: Currency,
    prefix: TelegramMessagePrefix,
  ): Promise<number> {
    try {
      const row = await this.stat.createDonationRow(
        model.chatId,
        price,
        currency,
      );
      return this.stat.getDonationId(row);
    } catch (err) {
      const errorMessage = `Unable to create donationId for price=${price}`;
      logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
      model.analytics.addError(errorMessage);
      throw err;
    }
  }

  private async sendInvoice(
    chatId: ChatId,
    amount: number,
    currency: Currency,
    donationId: number,
    lang: LanguageCode,
    prefix: TelegramMessagePrefix,
    token?: string,
    forumThreadId?: MessageThreadId,
  ): Promise<void> {
    const title = this.text.t(TranslationKeys.DonationTitle, lang);
    const description = this.text.t(TranslationKeys.DonationDescription, lang);
    const label = this.text.t(TranslationKeys.DonationLabel, lang);

    const invoice: TgInvoice = {
      chatId,
      amount: isStars(currency) ? amount : amount * 100,
      currency,
      meta: String(donationId),
      token,
      title,
      description,
      label,
      payload: getDonationDtoString(donationId, chatId, prefix.id),
      photo: getBotLogo(),
      forumThreadId,
    };

    try {
      await this.bot.payments.sendInvoice(invoice);
      logger.info(`${prefix.getPrefix()} Invoice sent`);
    } catch (err) {
      logger.error(`${prefix.getPrefix()} Unable to send the invoice`, err);
      throw err;
    }
  }
}
