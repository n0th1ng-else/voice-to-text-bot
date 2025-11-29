import { GenericAction } from "./common.js";
import { isVoiceMessage } from "../helpers.js";
import { Logger } from "../../logger/index.js";
import { TranslationKeys } from "../../text/types.js";
import { collectAnalytics } from "../../analytics/index.js";
import { VoiceContentReason } from "../types.js";
import type { TelegramMessagePrefix } from "../models/messagePrefix.js";
import type { BotMessageModel } from "../models/botMessage.js";
import type { TgMessage } from "../api/types.js";
import { getMaxDuration } from "../../text/utils.js";
import type { LanguageCode } from "../../recognition/types.js";
import { durationLimitSec } from "../../const.js";

const logger = new Logger("telegram-bot");

export class VoiceLengthAction extends GenericAction {
  private static readonly maxVoiceDuration = getMaxDuration();

  private static isVoiceMessageLong(model: BotMessageModel): boolean {
    return model.voiceDuration >= durationLimitSec;
  }

  public runAction(mdl: BotMessageModel, prefix: TelegramMessagePrefix): Promise<void> {
    mdl.analytics.addPageVisit();
    return this.sendVoiceIsTooLongMessage(mdl, prefix);
  }

  public async runCondition(msg: TgMessage, mdl: BotMessageModel): Promise<boolean> {
    const type = isVoiceMessage(msg);
    const isVoice = type.type === VoiceContentReason.Ok;
    return Promise.resolve(isVoice && VoiceLengthAction.isVoiceMessageLong(mdl));
  }

  private async sendVoiceIsTooLongMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.warn("Message is too long", {
      durationSec: model.voiceDuration,
      ...prefix,
    });

    model.analytics.addTime("voice-length", model.voiceDuration * 1_000);

    if (model.isGroup) {
      return collectAnalytics(
        model.analytics.setCommand("/voice", "Voice message is too long", "Group"),
      );
    }

    logger.info(`${prefix.getPrefix()} Sending voice is too long`);
    return this.getChatLanguage(model, prefix)
      .then((lang) =>
        this.sendMessage(
          model.chatId,
          [
            [
              TranslationKeys.LongVoiceMessage,
              {
                duration: this.getDurationString(lang),
              },
            ],
          ],
          {
            lang,
          },
          prefix,
          model.forumThreadId,
        ),
      )
      .then(() => logger.info(`${prefix.getPrefix()} Voice is too long message sent`))
      .catch((err) => {
        const errorMessage = "Unable to send voice is too long";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand("/voice", "Voice message is too long", "Private"),
        ),
      );
  }

  private getDurationString(lang: LanguageCode): string {
    const [min, sec] = VoiceLengthAction.maxVoiceDuration;
    const parts: string[] = [];
    if (min > 0) {
      parts.push(
        this.text.t(TranslationKeys.FormattedTimeMinutes, lang, {
          minutes: min,
        }),
      );
    }

    if (sec > 0) {
      parts.push(
        this.text.t(TranslationKeys.FormattedTimeSeconds, lang, {
          seconds: sec,
        }),
      );
    }

    const duration = parts.filter(Boolean).join(" ");
    return duration;
  }
}
