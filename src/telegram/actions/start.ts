import { GenericAction } from "./common.js";
import { isCommandMessage } from "../helpers.js";
import { TranslationKeys } from "../../text/types.js";
import { Logger } from "../../logger/index.js";
import { collectAnalytics } from "../../analytics/index.js";
import { BotCommand, type TelegramMessagePrefix } from "../types.js";
import type { BotMessageModel } from "../model.js";
import type { TgMessage } from "../api/types.js";

const logger = new Logger("telegram-bot");

export class StartAction extends GenericAction {
  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addFirstVisit();
    mdl.analytics.addPageVisit();
    return this.sendHelloMessage(mdl, prefix);
  }

  public async runCondition(
    msg: TgMessage,
    mdl: BotMessageModel,
  ): Promise<boolean> {
    const isStartMessage = isCommandMessage(mdl, msg, BotCommand.Start);
    return Promise.resolve(isStartMessage);
  }

  private sendHelloMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending hello message`);
    return this.getChatLanguage(model, prefix)
      .then((lang) =>
        this.sendMessage(
          model.chatId,
          [
            TranslationKeys.WelcomeMessage,
            TranslationKeys.WelcomeMessageGroup,
            TranslationKeys.WelcomeMessageMore,
            TranslationKeys.DonateMessage,
          ],
          { lang },
          prefix,
          model.forumThreadId,
        ),
      )
      .then(() => logger.info(`${prefix.getPrefix()} Hello message sent`))
      .catch((err) => {
        const errorMessage = "Unable to send hello message";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand(BotCommand.Start, "Hello message", "Init"),
        ),
      );
  }
}
