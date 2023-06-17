import { TgMessage } from "../api/types.js";
import { GenericAction } from "./common.js";
import { isHelloMessage } from "../helpers.js";
import {
  BotCommand,
  BotMessageModel,
  TelegramMessagePrefix,
} from "../types.js";
import { LabelId } from "../../text/labels.js";
import { Logger } from "../../logger/index.js";
import { collectAnalytics } from "../../analytics/index.js";

const logger = new Logger("telegram-bot");

export class StartAction extends GenericAction {
  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    mdl.analytics.addFirstVisit();
    mdl.analytics.addPageVisit();
    return this.sendHelloMessage(mdl, prefix);
  }

  public runCondition(msg: TgMessage, mdl: BotMessageModel): boolean {
    return isHelloMessage(mdl, msg);
  }

  private sendHelloMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending hello message`);
    return this.getChatLanguage(model, prefix)
      .then((lang) =>
        this.sendMessage(
          model.id,
          model.chatId,
          [
            LabelId.WelcomeMessage,
            LabelId.WelcomeMessageGroup,
            LabelId.WelcomeMessageMore,
            LabelId.DonateMessage,
          ],
          { lang },
          prefix,
          model.forumThreadId
        )
      )
      .then(() => logger.info(`${prefix.getPrefix()} Hello message sent`))
      .catch((err) => {
        const errorMessage = "Unable to send hello message";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand(BotCommand.Start, "Hello message", "Init")
        )
      );
  }
}
