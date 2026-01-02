import { GenericAction } from "./common.js";
import { isVoiceMessage } from "../helpers.js";
import { Logger } from "../../logger/index.js";
import { TranslationKeys } from "../../text/types.js";
import { collectAnalytics } from "../../analytics/index.js";
import { VoiceContentReason } from "../types.js";
import type { TelegramMessagePrefix } from "../models/messagePrefix.js";
import type { BotMessageModel } from "../models/botMessage.js";
import type { TgMessage } from "../api/types.js";
import { getSupportedAudioFormats } from "../../text/utils.js";

const logger = new Logger("telegram-bot");

export class VoiceFormatAction extends GenericAction {
  public runAction(mdl: BotMessageModel, prefix: TelegramMessagePrefix): Promise<void> {
    mdl.analytics.addPageVisit();
    return this.sendWrongFormatMessage(mdl, prefix);
  }

  public async runCondition(
    msg: TgMessage,
    _mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<boolean> {
    const type = isVoiceMessage(msg);
    const isVoice = type.type === VoiceContentReason.Ok;
    const isWrongFormat = type.type === VoiceContentReason.WrongMimeType;
    const triggersAction = !isVoice && isWrongFormat;

    if (triggersAction) {
      logger.warn(
        "Wrong audio file mime-type",
        {
          ...type,
          ...prefix,
        },
        true,
      );
    }

    return triggersAction;
  }

  private async sendWrongFormatMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    if (model.isGroup) {
      logger.info(`${prefix.getPrefix()} Voice mime-type is not supported`);
      return collectAnalytics(
        model.analytics.setCommand("/voice", "Wrong voice message mime-type", "Group"),
      );
    }

    logger.info(`${prefix.getPrefix()} Sending mime-type is not supported`);
    return this.getChatLanguage(model, prefix)
      .then((lang) =>
        this.sendMessage(
          model.chatId,
          [
            TranslationKeys.AudioNotSupportedMessage,
            [
              TranslationKeys.SupportedFormatsMessage,
              {
                formats: getSupportedAudioFormats(),
              },
            ],
            TranslationKeys.SupportedFormatsMessageExplanation,
          ],
          {
            lang,
          },
          prefix,
          model.forumThreadId,
        ),
      )
      .then(() => logger.info(`${prefix.getPrefix()} Mime-type is not supported message sent`))
      .catch((err) => {
        const errorMessage = "Unable to send mime-type is not supported";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand("/voice", "Wrong voice message mime-type", "Private"),
        ),
      );
  }
}
