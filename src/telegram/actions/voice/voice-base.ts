import { CoreAction } from "../common.js";
import { Logger } from "../../../logger/index.js";
import { TranslationKeys } from "../../../text/types.js";
import { collectAnalytics } from "../../../analytics/index.js";
import type { TelegramMessagePrefix } from "../../models/messagePrefix.js";
import type { BotMessageModel } from "../../models/botMessage.js";
import { getMaxDuration } from "../../../text/utils.js";
import type { LanguageCode } from "../../../recognition/types.js";

const logger = new Logger("telegram-bot");

export abstract class VoiceBaseAction extends CoreAction {
  protected static readonly maxVoiceDuration = getMaxDuration();

  protected async sendVoiceIsTooLongMessage(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
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
    const [min, sec] = VoiceBaseAction.maxVoiceDuration;
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
