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
import { collectAnalytics, collectPageAnalytics } from "../../analytics";

const logger = new Logger("telegram-bot");

export class VoiceLengthAction extends GenericAction {
  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    collectPageAnalytics(mdl.analytics, "/voice");
    mdl.analytics.v4.addPageVisit();
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

    model.analytics.v4.addTime("voice-length", model.voiceDuration * 1_000);

    if (model.isGroup) {
      return collectAnalytics(
        model.analytics.setCommand(
          "/voice",
          "Voice message is too long",
          "Group"
        )
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
      .catch((err) => {
        const errorMessage = "Unable to send voice is too long";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.setError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand(
            "/voice",
            "Voice message is too long",
            "Private"
          )
        )
      );
  }
}
