import { TgInlineKeyboardButton, TgMessage } from "../api/types";
import { GenericAction } from "./common";
import { BotMessageModel, TelegramMessagePrefix } from "../types";
import { isFundMessage } from "../helpers";
import { LabelId } from "../../text/labels";
import { patreonAccount } from "../../const";
import { Logger } from "../../logger";

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

        const buttons: TgInlineKeyboardButton[][] = [[patreonBtn]];

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
      .catch((err) =>
        logger.error(`${prefix.getPrefix()} Unable to send fund message`, err)
      );
  }
}
