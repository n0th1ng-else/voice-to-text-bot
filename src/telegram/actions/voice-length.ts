import { TgMessage } from "../api/types";
import { GenericAction } from "./common";
import {
  BotMessageModel,
  TelegramMessagePrefix,
  VoiceContentReason,
} from "../types";
import { isVoiceMessage, isVoiceMessageLong } from "../helpers";
import { Logger } from "../../logger";
import { LabelId } from "../../text/labels";
import { collectAnalytics } from "../../analytics";

const logger = new Logger("telegram-bot");

export class VoiceLengthAction extends GenericAction {
  public runAction(
    msg: TgMessage,
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    return this.sendVoiceIsTooLongMessage(mdl, prefix);
  }

  public runCondition(msg: TgMessage, mdl: BotMessageModel): boolean {
    const type = isVoiceMessage(msg);
    const isVoice = type.type === VoiceContentReason.Ok;
    return isVoice && isVoiceMessageLong(mdl);
  }

  private sendVoiceIsTooLongMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    logger.warn(
      `${prefix.getPrefix()} Message is too long duration=${
        model.voiceDuration
      }s`
    );

    if (model.isGroup) {
      return collectAnalytics(
        model.analytics.setCommand("Voice is too long message", "/voice")
      );
    }

    logger.info(`${prefix.getPrefix()} Sending voice is too long`);
    return this.getChatLanguage(model, prefix)
      .then((lang) =>
        this.sendMessage(
          model.id,
          model.chatId,
          LabelId.LongVoiceMessage,
          {
            lang,
          },
          prefix
        )
      )
      .then(() =>
        logger.info(`${prefix.getPrefix()} Voice is too long message sent`)
      )
      .catch((err) =>
        logger.error(
          `${prefix.getPrefix()} Unable to send voice is too long`,
          err
        )
      )
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand("Voice is too long message", "/voice")
        )
      );
  }
}
