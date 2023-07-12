import { TgInlineKeyboardButton, TgMessage } from "../api/types.js";
import { GenericAction } from "./common.js";
import {
  BotCommand,
  BotMessageModel,
  TelegramMessagePrefix,
} from "../types.js";
import { isSupportMessage } from "../helpers.js";
import { LabelId } from "../../text/labels.js";
import { githubUrl, officialChannelAccount } from "../../const.js";
import { Logger } from "../../logger/index.js";
import { collectAnalytics } from "../../analytics/index.js";

const logger = new Logger("telegram-bot");

export class SupportAction extends GenericAction {
  private authorUrl?: string;

  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
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
    prefix: TelegramMessagePrefix,
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
            options: { buttons },
          },
          prefix,
          model.forumThreadId,
        );
      })
      .then(() => logger.info(`${prefix.getPrefix()} Support message sent`))
      .catch((err) => {
        const errorMessage = "Unable to send support message";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand(
            BotCommand.Support,
            "Support message",
            "Init",
          ),
        ),
      );
  }
}
