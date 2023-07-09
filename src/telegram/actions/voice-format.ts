import { TgMessage } from "../api/types.js";
import { GenericAction } from "./common.js";
import {
  BotMessageModel,
  TelegramMessagePrefix,
  VoiceContentReason,
} from "../types.js";
import { isVoiceMessage } from "../helpers.js";
import { Logger } from "../../logger/index.js";
import { LabelId } from "../../text/labels.js";
import { collectAnalytics } from "../../analytics/index.js";

const logger = new Logger("telegram-bot");

export class VoiceFormatAction extends GenericAction {
  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
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
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    if (model.isGroup) {
      logger.info(`${prefix.getPrefix()} Voice mime-type is not supported`);
      return collectAnalytics(
        model.analytics.setCommand(
          "/voice",
          "Wrong voice message mime-type",
          "Group",
        ),
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
          prefix,
          model.forumThreadId,
        ),
      )
      .then(() =>
        logger.info(
          `${prefix.getPrefix()} Mime-type is not supported message sent`,
        ),
      )
      .catch((err) => {
        const errorMessage = "Unable to send mime-type is not supported";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand(
            "/voice",
            "Wrong voice message mime-type",
            "Private",
          ),
        ),
      );
  }
}
