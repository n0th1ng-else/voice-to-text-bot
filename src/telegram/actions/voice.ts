import { GenericAction } from "./common.js";
import { isVoiceMessage } from "../helpers.js";
import { Logger } from "../../logger/index.js";
import { TranslationKeys } from "../../text/types.js";
import type {
  LanguageCode,
  VoiceConverters,
  VoiceConvertersHealth,
} from "../../recognition/types.js";
import { collectAnalytics } from "../../analytics/index.js";
import { TimeMeasure } from "../../common/timer.js";
import { isBlockedByUser } from "../api/tgerror.js";
import { VoiceContentReason } from "../types.js";
import type { TelegramMessagePrefix } from "../models/messagePrefix.js";
import type { BotMessageModel } from "../models/botMessage.js";
import { getFullFileName } from "../../files/index.js";
import type { TgMessage } from "../api/types.js";
import type { FileId } from "../api/core.js";
import {
  trackFullRecognitionTime,
  trackProcessFile,
  trackUserActivity,
  trackVoiceDuration,
} from "../../monitoring/newrelic.js";
import { getConverterType } from "../../subscription/utils.js";
import { addAttachment, clearAttachments } from "../../monitoring/sentry/index.js";

const logger = new Logger("telegram-bot");

export class VoiceAction extends GenericAction {
  private converters?: VoiceConverters;

  public runAction(mdl: BotMessageModel, prefix: TelegramMessagePrefix): Promise<void> {
    mdl.analytics.addPageVisit();
    trackProcessFile("progress");
    trackUserActivity({ activityType: "voice" }, mdl.userId);
    const duration = new TimeMeasure();
    logger.info(`${prefix.getPrefix()} Voice message`);
    return this.getChatLanguage(mdl, prefix)
      .then((lang) => this.recogniseVoiceMessage(mdl, lang, prefix))
      .then(() => {
        trackFullRecognitionTime(duration.getMs());
        return collectAnalytics(mdl.analytics.setCommand("/voice", "Voice message", "Init"));
      });
  }

  public async runCondition(
    msg: TgMessage,
    _mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<boolean> {
    const type = isVoiceMessage(msg);
    const isVoice = type.type === VoiceContentReason.Ok;
    const isNoContent = type.type === VoiceContentReason.NoContent;

    if (!isVoice && !isNoContent) {
      logger.warn(
        "Some problems identified during the voice object detection",
        { ...type, ...prefix },
        true,
      );
    }

    return isVoice;
  }

  public setConverters(converters: VoiceConverters): void {
    this.converters = converters;
  }

  public async getVoiceRecognizersHealth(): Promise<VoiceConvertersHealth> {
    if (!this.converters) {
      const res: VoiceConvertersHealth = {
        main: {
          provider: "n/a",
          state: "error",
        },
        advanced: {
          provider: "n/a",
          state: "error",
        },
      };
      return res;
    }

    const res: VoiceConvertersHealth = {
      main: {
        provider: this.converters.main.name,
        state: await this.converters.main.getStatus(),
      },
      advanced: {
        provider: this.converters.advanced.name,
        state: await this.converters.advanced.getStatus(),
      },
    };
    return res;
  }

  private async recogniseVoiceMessage(
    model: BotMessageModel,
    lang: LanguageCode,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Processing voice`);

    return this.getFileLInk(model, prefix)
      .then(([fileId, fileLink, isLocalFile]) => {
        if (!this.converters) {
          throw new Error("Voice converters are not set!");
        }

        addAttachment(fileId, fileLink);
        const converter = getConverterType(model);

        return Promise.all([
          this.converters[converter].transformToText(
            fileLink,
            model.voiceDuration,
            lang,
            {
              fileId,
              prefix: prefix.getPrefix(),
            },
            isLocalFile,
          ),
          Promise.resolve(new TimeMeasure()),
          this.sendInProgressMessage(model, lang, prefix),
        ]);
      })
      .then(([text, time]) => {
        if (!text) {
          logger.warn(`${prefix.getPrefix()} Empty recognition response`);
          if (model.isGroup) {
            return;
          }

          return this.sendMessage(
            model.chatId,
            [TranslationKeys.RecognitionEmpty],
            {
              lang,
            },
            prefix,
            model.forumThreadId,
          );
        }

        model.analytics.addTime("voice-to-text-time", time.getMs());
        const name = model.fullUserName || model.userName;
        const msgPrefix = model.isGroup && name ? `${name} ` : "";
        return this.sendRawMessage(
          model.chatId,
          `${msgPrefix}🗣 ${text}`,
          lang,
          {
            disableMarkup: true,
          },
          model.forumThreadId,
        );
      })
      .then(() => {
        logger.info(`${prefix.getPrefix()} Voice successfully converted`);
        trackVoiceDuration(model.voiceType, model.chatType, model.voiceDuration);
        return this.updateUsageCount(model, prefix);
      })
      .catch((err) => {
        const isBlocked = isBlockedByUser(err);
        const errorMessage = "Unable to recognize the file";
        const duration = Logger.y(`${model.voiceDuration}sec`);
        const logError = `${prefix.getPrefix()} ${errorMessage} with duration ${duration}`;
        if (isBlocked) {
          // TODO remove faking errors into warnings
          logger.warn(logError, err);
        } else {
          logger.error(logError, err);
        }

        model.analytics.addError(errorMessage);
        trackProcessFile("failed");

        if (model.isGroup) {
          return;
        }

        return this.sendMessage(
          model.chatId,
          [TranslationKeys.RecognitionFailed],
          {
            lang,
          },
          prefix,
          model.forumThreadId,
        );
      })
      .catch((err) => {
        const errorMessage = "Unable to send a message that file is unable to recognize";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      })
      .finally(() => {
        clearAttachments();
      });
  }

  private async getFileLInk(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<[FileId, string, boolean]> {
    logger.info(`${prefix.getPrefix()} Fetching file link`);

    if (!model.voiceFileId) {
      throw new Error("Unable to find a voice file in the message");
    }

    const [fileLink, isLocalFile, err] = await this.bot.downloadFile(
      getFullFileName("original_file", true),
      model.voiceFileId,
      model.chatId,
    );

    if (err) {
      logger.error("Error during file download", err);
    }

    return [model.voiceFileId, fileLink, isLocalFile];
  }

  private async sendInProgressMessage(
    model: BotMessageModel,
    lang: LanguageCode,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    if (model.isGroup) {
      return;
    }

    return this.sendMessage(
      model.chatId,
      [TranslationKeys.InProgress],
      {
        lang,
      },
      prefix,
      model.forumThreadId,
    ).catch((err) => {
      const isBlocked = isBlockedByUser(err);
      const errorMessage = "Unable to send in progress message";
      const logError = `${prefix.getPrefix()} ${errorMessage}`;
      if (isBlocked) {
        // TODO remove faking errors into warnings
        logger.warn(logError, err);
      } else {
        logger.error(logError, err);
      }

      model.analytics.addError(errorMessage);
    });
  }

  private updateUsageCount(model: BotMessageModel, prefix: TelegramMessagePrefix): Promise<void> {
    logger.info(`${prefix.getPrefix()} Updating usage count`);

    return this.stat
      .updateUsageCount(model.chatId, model.name, model.userLanguage)
      .then(() => logger.info(`${prefix.getPrefix()} Usage count updated`))
      .catch((err) => {
        const errorMessage = "Unable to update usage count";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      });
  }
}
