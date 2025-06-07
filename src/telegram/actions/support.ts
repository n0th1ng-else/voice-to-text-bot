import { GenericAction } from "./common.js";
import { BotCommand } from "../commands.js";
import { isCommandMessage } from "../commandsChecker.js";
import { TranslationKeys } from "../../text/types.js";
import { githubUrl, officialChannelAccount } from "../../const.js";
import { Logger } from "../../logger/index.js";
import { collectAnalytics } from "../../analytics/index.js";
import { type TelegramMessagePrefix } from "../types.js";
import type { BotMessageModel } from "../model.js";
import type { TgMessage } from "../api/types.js";
import type { TgInlineKeyboardButton } from "../api/groups/chats/chats-types.js";
import { trackUserActivity } from "../../monitoring/newrelic.js";

const logger = new Logger("telegram-bot");

export class SupportAction extends GenericAction {
  private authorUrl?: string;

  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    trackUserActivity({ activityType: "support" }, mdl.userId);
    return this.sendSupportMessage(mdl, prefix);
  }

  public async runCondition(
    msg: TgMessage,
    mdl: BotMessageModel,
  ): Promise<boolean> {
    const isSupportMessage = isCommandMessage(mdl, msg, BotCommand.Support);
    return Promise.resolve(isSupportMessage);
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
          text: this.text.t(TranslationKeys.GithubIssues, lang),
          url: githubUrl,
        };

        const newsBtn: TgInlineKeyboardButton = {
          text: this.text.t(TranslationKeys.OfficialChannel, lang),
          url: officialChannelAccount,
        };

        const authorBtn: TgInlineKeyboardButton = {
          text: this.text.t(TranslationKeys.ContactAuthor, lang),
          url: this.authorUrl,
        };

        const buttons: TgInlineKeyboardButton[][] = this.authorUrl
          ? [[newsBtn], [authorBtn], [issueBtn]]
          : [[newsBtn], [issueBtn]];

        return this.sendMessage(
          model.chatId,
          [TranslationKeys.SupportCommand],
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
