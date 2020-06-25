import TelegramBot from "node-telegram-bot-api";
import { GenericAction } from "./common";
import { BotMessageModel } from "../types";
import { isSupportMessage } from "../helpers";
import { LabelId } from "../../text/labels";
import { githubUrl } from "../../const";
import { Logger } from "../../logger";

const logger = new Logger("telegram-bot");

export class SupportAction extends GenericAction {
  private authorUrl?: string;

  public runAction(
    msg: TelegramBot.Message,
    mdl: BotMessageModel,
    prefix: string
  ): Promise<void> {
    return this.sendSupportMessage(mdl, prefix);
  }

  public runCondition(msg: TelegramBot.Message, mdl: BotMessageModel): boolean {
    return isSupportMessage(mdl, msg);
  }

  public setAuthorUrl(url: string) {
    this.authorUrl = url;
  }

  private sendSupportMessage(
    model: BotMessageModel,
    prefix: string
  ): Promise<void> {
    logger.info(`${prefix} Sending support message`);

    return this.getChatLanguage(model, prefix)
      .then((lang) => {
        const buttons: TelegramBot.InlineKeyboardButton[] = [];
        buttons.push({
          text: this.text.t(LabelId.GithubIssues, lang),
          url: githubUrl,
        });

        if (this.authorUrl) {
          buttons.push({
            text: this.text.t(LabelId.ContactAuthor, lang),
            url: this.authorUrl,
          });
        }

        return this.sendMessage(
          model.id,
          model.chatId,
          LabelId.SupportCommand,
          {
            lang,
            options: {
              reply_markup: {
                inline_keyboard: [buttons],
              },
            },
          },
          prefix
        );
      })
      .then(() => logger.info(`${prefix} Support message sent`))
      .catch((err) =>
        logger.error(`${prefix} Unable to send support message`, err)
      );
  }
}
