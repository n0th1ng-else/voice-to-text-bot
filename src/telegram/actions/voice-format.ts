import { TgMessage } from "../api/types";
import { GenericAction } from "./common";
import {
  BotMessageModel,
  TelegramMessagePrefix,
  VoiceContentReason,
} from "../types";
import { isVoiceMessage } from "../helpers";
import { Logger } from "../../logger";
import { LabelId } from "../../text/labels";
import { collectAnalytics } from "../../analytics";

const logger = new Logger("telegram-bot");

export class VoiceFormatAction extends GenericAction {
  public runAction(
    msg: TgMessage,
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    return this.sendWrongFormatMessage(mdl, prefix);
  }

  public runCondition(msg: TgMessage): boolean {
    const type = isVoiceMessage(msg);
    const isVoice = type.type === VoiceContentReason.Ok;
    const isWrongFormat = type.type === VoiceContentReason.WrongMimeType;
    const triggersAction = !isVoice && isWrongFormat;

    if (triggersAction) {
      logger.warn("Wrong audio file mime-type", type);
    }

    return triggersAction;
  }

  private sendWrongFormatMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    if (model.isGroup) {
      logger.info(`${prefix.getPrefix()} Voice mime-type is not supported`);
      return collectAnalytics(
        model.analytics.setCommand("Mime-type message", "/voice")
      );
    }

    logger.info(`${prefix.getPrefix()} Sending mime-type is not supported`);
    return this.getChatLanguage(model, prefix)
      .then((lang) =>
        this.sendMessage(
          model.id,
          model.chatId,
          [
            LabelId.AudioNotSupportedMessage,
            LabelId.SupportedFormatsMessage,
            LabelId.SupportedFormatsMessageExplanation,
          ],
          {
            lang,
          },
          prefix
        )
      )
      .then(() =>
        logger.info(
          `${prefix.getPrefix()} Mime-type is not supported message sent`
        )
      )
      .catch((err) => {
        const errorMessage = "Unable to send mime-type is not supported";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.setError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand("Mime-type message", "/voice")
        )
      );
  }
}
