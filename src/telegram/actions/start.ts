import TelegramBot from "node-telegram-bot-api";
import { GenericAction } from "./common";
import { isHelloMessage } from "../helpers";
import { BotMessageModel } from "../types";
import { LabelId } from "../../text/labels";
import { Logger } from "../../logger";

const logger = new Logger("telegram-bot");

export class StartAction extends GenericAction {
  public runAction(
    msg: TelegramBot.Message,
    mdl: BotMessageModel,
    prefix: string
  ): Promise<void> {
    return this.sendHelloMessage(mdl, prefix);
  }

  public runCondition(msg: TelegramBot.Message, mdl: BotMessageModel): boolean {
    return isHelloMessage(mdl, msg);
  }

  private sendHelloMessage(
    model: BotMessageModel,
    prefix: string
  ): Promise<void> {
    logger.info(`${prefix} Sending hello message`);
    return this.getChatLanguage(model, prefix)
      .then((lang) =>
        this.sendMessage(
          model.id,
          model.chatId,
          [
            LabelId.WelcomeMessage,
            LabelId.WelcomeMessageGroup,
            LabelId.WelcomeMessageMore,
          ],
          { lang },
          prefix
        )
      )
      .then(() => logger.info(`${prefix} Hello message sent`))
      .catch((err) =>
        logger.error(`${prefix} Unable to send hello message`, err)
      );
  }
}
