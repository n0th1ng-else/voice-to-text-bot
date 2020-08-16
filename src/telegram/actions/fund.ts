import { TgInlineKeyboardButton, TgMessage } from "../api/types";
import { GenericAction } from "./common";
import { BotCommand, BotMessageModel, TelegramMessagePrefix } from "../types";
import { isFundMessage } from "../helpers";
import { LabelId } from "../../text/labels";
import { patreonAccount, yandexAccount } from "../../const";
import { Logger } from "../../logger";
import { collectAnalytics } from "../../analytics";

const logger = new Logger("telegram-bot");

export class FundAction extends GenericAction {
  public runAction(
    msg: TgMessage,
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    return this.sendFundMessage(mdl, prefix);
  }

  public runCondition(msg: TgMessage, mdl: BotMessageModel): boolean {
    return isFundMessage(mdl, msg);
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

        // const kofiBtn: TgInlineKeyboardButton = {
        //   text: this.text.t(LabelId.KofiLinkTitle, lang),
        //   url: kofiAccount,
        // };

        const yandexBtn: TgInlineKeyboardButton = {
          text: this.text.t(LabelId.YandexLinkTitle, lang),
          url: yandexAccount,
        };

        const buttons: TgInlineKeyboardButton[][] = [
          [patreonBtn],
          // [kofiBtn],
          [yandexBtn],
        ];

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
          model.analytics.setCommand("Fund message", BotCommand.Fund)
        )
      );
  }
}
