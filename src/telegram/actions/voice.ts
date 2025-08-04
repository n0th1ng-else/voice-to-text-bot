import { GenericAction } from "./common.js";
import { isVoiceMessage } from "../helpers.js";
import { Logger } from "../../logger/index.js";
import { TranslationKeys } from "../../text/types.js";
import {
  type LanguageCode,
  type VoiceConverters,
} from "../../recognition/types.js";
import { collectAnalytics } from "../../analytics/index.js";
import { TimeMeasure } from "../../common/timer.js";
import { isBlockedByUser } from "../api/tgerror.js";
import { type TelegramMessagePrefix, VoiceContentReason } from "../types.js";
import type { BotMessageModel } from "../model.js";
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

const logger = new Logger("telegram-bot");

export class VoiceAction extends GenericAction {
  private converters?: VoiceConverters;

  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    trackProcessFile("progress");
    trackUserActivity({ activityType: "voice" }, mdl.userId);
    const duration = new TimeMeasure();
    logger.info(`${prefix.getPrefix()} Voice message`);
    return this.getChatLanguage(mdl, prefix)
      .then((lang) => this.recogniseVoiceMessage(mdl, lang, prefix))
      .then(() => {
        trackFullRecognitionTime(duration.getMs());
        return collectAnalytics(
          mdl.analytics.setCommand("/voice", "Voice message", "Init"),
        );
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

    return Promise.resolve(isVoice);
  }

  public setConverters(converters: VoiceConverters): void {
    this.converters = converters;
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
          return Promise.reject(new Error("Voice converters are not set!"));
        }

        const converter = getConverterType(model);

        return Promise.all([
          this.converters[converter].transformToText(
            fileLink,
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
        trackVoiceDuration(
          model.voiceType,
          model.chatType,
          model.voiceDuration,
        );
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
        const errorMessage =
          "Unable to send a message that file is unable to recognize";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      });
  }

  private async getFileLInk(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<[FileId, string, boolean]> {
    logger.info(`${prefix.getPrefix()} Fetching file link`);

    if (!model.voiceFileId) {
      return Promise.reject(
        new Error("Unable to find a voice file in the message"),
      );
    }

    const [fileLink, isLocalFile] = await this.bot.downloadFile(
      getFullFileName("original_file", true),
      model.voiceFileId,
      model.chatId,
    );

    if (isLocalFile) {
      logger.info("Downloaded the file using the MTProto");
    } else {
      logger.info("Downloaded the file using the API");
    }

    return [model.voiceFileId, fileLink, isLocalFile];
  }

  private sendInProgressMessage(
    model: BotMessageModel,
    lang: LanguageCode,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    if (model.isGroup) {
      return Promise.resolve();
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

  private updateUsageCount(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
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
