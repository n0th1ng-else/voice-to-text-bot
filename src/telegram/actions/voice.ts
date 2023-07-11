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
import { type LanguageCode, VoiceConverter } from "../../recognition/types.js";
import { collectAnalytics } from "../../analytics/index.js";
import { TimeMeasure } from "../../common/timer.js";
import { isBlockedByUser } from "../api/tgerror.js";
import { flattenPromise } from "../../common/helpers.js";

const logger = new Logger("telegram-bot");

export class VoiceAction extends GenericAction {
  private converter?: VoiceConverter;

  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    logger.info(`${prefix.getPrefix()} Voice message`);
    return this.getChatLanguage(mdl, prefix)
      .then((lang) => this.recogniseVoiceMessage(mdl, lang, prefix))
      .then(() =>
        collectAnalytics(
          mdl.analytics.setCommand("/voice", "Voice message", "Init"),
        ),
      );
  }

  public runCondition(msg: TgMessage): boolean {
    const type = isVoiceMessage(msg);
    const isVoice = type.type === VoiceContentReason.Ok;
    const isNoContent = type.type === VoiceContentReason.NoContent;

    if (!isVoice && !isNoContent) {
      logger.warn(
        "Some problems identified during the voice object detection",
        type,
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
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Processing voice`);

    return this.getFileLInk(model, prefix)
      .then((fileLink) => {
        if (!this.converter) {
          return Promise.reject(new Error("Voice converter is not set!"));
        }

        return Promise.all([
          this.converter.transformToText(fileLink, model.isVideo, lang, {
            fileId: model.voiceFileId,
            prefix: prefix.getPrefix(),
          }),
          Promise.resolve(new TimeMeasure()),
          this.sendInProgressMessage(model, lang, prefix),
        ]);
      })
      .then(([text, time, messageId]) => {
        if (!text) {
          return this.sendEmptyRecognition(model, lang, prefix, messageId);
        }

        model.analytics.addTime("voice-to-text-time", time.getMs());
        return this.sendRecognition(model, lang, text, prefix, messageId);
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

        model.analytics.addError(errorMessage);

        if (model.isGroup) {
          return;
        }

        return this.sendMessage(
          model.chatId,
          model.id,
          LabelId.RecognitionFailed,
          {
            lang,
          },
          prefix,
          model.forumThreadId,
        ).then(flattenPromise); // TODO fix
      })
      .catch((err) => {
        const errorMessage =
          "Unable to send a message that file is unable to recognize";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      });
  }

  private getFileLInk(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<string> {
    logger.info(`${prefix.getPrefix()} Fetching file link`);

    if (!model.voiceFileId) {
      return Promise.reject(
        new Error("Unable to find a voice file in the message"),
      );
    }

    return this.bot.getFileLink(model.voiceFileId);
  }

  private sendInProgressMessage(
    model: BotMessageModel,
    lang: LanguageCode,
    prefix: TelegramMessagePrefix,
  ): Promise<number> {
    if (model.isGroup) {
      return Promise.resolve(0);
    }

    return this.sendMessage(
      model.chatId,
      model.id,
      LabelId.InProgress,
      {
        lang,
      },
      prefix,
      model.forumThreadId,
    )
      .then((messagesIds) => {
        const messageId = messagesIds.at(0);
        return messageId ?? 0;
      })
      .catch((err) => {
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
        return 0;
      });
  }

  private updateUsageCount(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Updating usage count`);

    return this.stat.usages
      .updateUsageCount(model.chatId, model.name, model.userLanguage)
      .then(() => logger.info(`${prefix.getPrefix()} Usage count updated`))
      .catch((err) => {
        const errorMessage = "Unable to update usage count";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      });
  }

  private deleteInProgressMessage(
    model: BotMessageModel,
    messageId: number,
    prefix: TelegramMessagePrefix,
  ): Promise<boolean> {
    if (!messageId) {
      return Promise.resolve(true);
    }
    return this.deleteMessage(model.chatId, messageId).catch((err) => {
      const errorMessage = "Unable to delete in progress message";
      logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
      model.analytics.addError(errorMessage);
      return false;
    });
  }

  private sendEmptyRecognition(
    model: BotMessageModel,
    lang: LanguageCode,
    prefix: TelegramMessagePrefix,
    inProgressMessageId: number,
  ): Promise<void> {
    logger.warn(`${prefix.getPrefix()} Empty recognition response`);
    if (model.isGroup) {
      return Promise.resolve();
    }

    return this.sendMessage(
      model.chatId,
      model.id,
      LabelId.RecognitionEmpty,
      {
        lang,
      },
      prefix,
      model.forumThreadId,
    )
      .then(() =>
        this.deleteInProgressMessage(model, inProgressMessageId, prefix),
      )
      .then(flattenPromise);
  }

  private sendRecognition(
    model: BotMessageModel,
    lang: LanguageCode,
    text: string,
    prefix: TelegramMessagePrefix,
    inProgressMessageId: number,
  ) {
    const name = model.fullUserName || model.userName;
    const msgPrefix = model.isGroup && name ? `${name} ` : "";
    const fullMessage = `${msgPrefix}🗣 ${text}`;

    return this.sendRawMessage(
      model.chatId,
      fullMessage,
      lang,
      {
        disableMarkup: true,
      },
      model.forumThreadId,
    )
      .then(() =>
        this.deleteInProgressMessage(model, inProgressMessageId, prefix),
      )
      .then(flattenPromise);
  }
}
