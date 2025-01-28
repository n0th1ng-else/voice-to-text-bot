import { GenericAction } from "./common.ts";
import { isHelloMessage } from "../helpers.ts";
import { TranslationKeys } from "../../text/types.ts";
import { Logger } from "../../logger/index.ts";
import { collectAnalytics } from "../../analytics/index.ts";
import {
  BotCommand,
  type BotMessageModel,
  type TelegramMessagePrefix,
} from "../types.ts";
import type { TgMessage } from "../api/types.ts";

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
    return Promise.resolve(isHelloMessage(mdl, msg));
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
          model.id,
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
