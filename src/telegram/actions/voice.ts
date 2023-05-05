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
import { LanguageCode, VoiceConverter } from "../../recognition/types.js";
import {
  collectAnalytics,
  collectPageAnalytics,
} from "../../analytics/index.js";
import { TimeMeasure } from "../../common/timer.js";
import { isBlockedByUser } from "../api/tgerror.js";

const logger = new Logger("telegram-bot");

export class VoiceAction extends GenericAction {
  private converter?: VoiceConverter;

  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    collectPageAnalytics(mdl.analytics, "/voice");
    mdl.analytics.v4.addPageVisit();
    logger.info(`${prefix.getPrefix()} Voice message`);
    return this.getChatLanguage(mdl, prefix)
      .then((lang) => this.recogniseVoiceMessage(mdl, lang, prefix))
      .then(() =>
        collectAnalytics(
          mdl.analytics.setCommand("/voice", "Voice message", "Init")
        )
      );
  }

  public runCondition(msg: TgMessage): boolean {
    const type = isVoiceMessage(msg);
    const isVoice = type.type === VoiceContentReason.Ok;
    const isNoContent = type.type === VoiceContentReason.NoContent;

    if (!isVoice && !isNoContent) {
      logger.warn(
        "Some problems identified during the voice object detection",
        type
      );
    }

    return isVoice;
  }

  public setConverter(converter: VoiceConverter): void {
    this.converter = converter;
  }

  private recogniseVoiceMessage(
    model: BotMessageModel,
    lang: LanguageCode,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Processing voice`);

    return this.getFileLInk(model, prefix)
      .then((fileLink) => {
        if (!this.converter) {
          return Promise.reject(new Error("Voice converter is not set!"));
        }

        return Promise.all([
          this.converter.transformToText(
            fileLink,
            model.voiceFileId,
            model.isVideo,
            lang
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
            model.id,
            model.chatId,
            LabelId.RecognitionEmpty,
            {
              lang,
            },
            prefix,
            model.forumThreadId
          );
        }

        model.analytics.v4.addTime("voice-to-text-time", time.getMs());
        const name = model.fullUserName || model.userName;
        const msgPrefix = model.isGroup && name ? `${name} ` : "";
        return this.sendRawMessage(
          model.chatId,
          `${msgPrefix}🗣 ${text}`,
          lang,
          {
            disableMarkup: true,
          },
          model.forumThreadId
        );
      })
      .then(() => {
        logger.info(`${prefix.getPrefix()} Voice successfully converted`);
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

        model.analytics.setError(errorMessage);

        if (model.isGroup) {
          return;
        }

        return this.sendMessage(
          model.id,
          model.chatId,
          LabelId.RecognitionFailed,
          {
            lang,
          },
          prefix,
          model.forumThreadId
        );
      })
      .catch((err) => {
        const errorMessage =
          "Unable to send a message that file is unable to recognize";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.setError(errorMessage);
      });
  }

  private getFileLInk(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<string> {
    logger.info(`${prefix.getPrefix()} Fetching file link`);

    if (!model.voiceFileId) {
      return Promise.reject(
        new Error("Unable to find a voice file in the message")
      );
    }

    return this.bot.getFileLink(model.voiceFileId);
  }

  private sendInProgressMessage(
    model: BotMessageModel,
    lang: LanguageCode,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    if (model.isGroup) {
      return Promise.resolve();
    }

    return this.sendMessage(
      model.id,
      model.chatId,
      LabelId.InProgress,
      {
        lang,
      },
      prefix,
      model.forumThreadId
    ).catch((err) => {
      const errorMessage = "Unable to send in progress message";
      logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
      model.analytics.setError(errorMessage);
    });
  }

  private updateUsageCount(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Updating usage count`);

    return this.stat.usages
      .updateUsageCount(model.chatId, model.name, model.userLanguage)
      .then(() => logger.info(`${prefix.getPrefix()} Usage count updated`))
      .catch((err) => {
        const errorMessage = "Unable to update usage count";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.setError(errorMessage);
      });
  }
}
