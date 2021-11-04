import { TgInlineKeyboardButton, TgMessage } from "../api/types";
import { GenericAction } from "./common";
import { BotCommand, BotMessageModel, TelegramMessagePrefix } from "../types";
import { isSupportMessage } from "../helpers";
import { LabelId } from "../../text/labels";
import { githubUrl, officialChannelAccount } from "../../const";
import { Logger } from "../../logger";
import { collectAnalytics } from "../../analytics";

const logger = new Logger("telegram-bot");

export class SupportAction extends GenericAction {
  private authorUrl?: string;

  public runAction(
    msg: TgMessage,
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    collectAnalytics(mdl.analytics, BotCommand.Support);
    return this.sendSupportMessage(mdl, prefix);
  }

  public runCondition(msg: TgMessage, mdl: BotMessageModel): boolean {
    return isSupportMessage(mdl, msg);
  }

  public setAuthorUrl(url: string): void {
    this.authorUrl = url;
  }

  private sendSupportMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending support message`);

    return this.getChatLanguage(model, prefix)
      .then((lang) => {
        const issueBtn: TgInlineKeyboardButton = {
          text: this.text.t(LabelId.GithubIssues, lang),
          url: githubUrl,
        };

        const newsBtn: TgInlineKeyboardButton = {
          text: this.text.t(LabelId.OfficialChannel, lang),
          url: officialChannelAccount,
        };

        const authorBtn: TgInlineKeyboardButton = {
          text: this.text.t(LabelId.ContactAuthor, lang),
          url: this.authorUrl,
        };

        const buttons: TgInlineKeyboardButton[][] = this.authorUrl
          ? [[newsBtn], [authorBtn], [issueBtn]]
          : [[newsBtn], [issueBtn]];

        return this.sendMessage(
          model.id,
          model.chatId,
          LabelId.SupportCommand,
          {
            lang,
            options: buttons,
          },
          prefix
        );
      })
      .then(() => logger.info(`${prefix.getPrefix()} Support message sent`))
      .catch((err) => {
        const errorMessage = "Unable to send support message";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.setError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand(
            BotCommand.Support,
            "Support message",
            "Init"
          )
        )
      );
  }
}
