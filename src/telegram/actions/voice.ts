import { TgMessage } from "../api/types";
import { GenericAction } from "./common";
import {
  BotMessageModel,
  TelegramMessagePrefix,
  VoiceContentReason,
} from "../types";
import { isVoiceMessage } from "../helpers";
import { Logger } from "../../logger";
import { LabelId } from "../../text/labels";
import { LanguageCode, VoiceConverter } from "../../recognition/types";
import { collectAnalytics } from "../../analytics";

const logger = new Logger("telegram-bot");

export class VoiceAction extends GenericAction {
  private converter?: VoiceConverter;

  public runAction(
    msg: TgMessage,
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Voice message`);
    return this.getChatLanguage(model, prefix)
      .then((lang) => this.recogniseVoiceMessage(model, lang, prefix))
      .then(() =>
        collectAnalytics(model.analytics.setCommand("Voice message", "/voice"))
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
          this.converter.transformToText(fileLink, model.voiceFileId, lang),
          this.sendInProgressMessage(model, lang, prefix),
        ]);
      })
      .then(([text]) => {
        if (!text) {
          return this.sendMessage(
            model.id,
            model.chatId,
            LabelId.RecognitionEmpty,
            {
              lang,
            },
            prefix
          );
        }

        const name = model.fullUserName || model.userName;
        const msgPrefix = model.isGroup && name ? `${name} ` : "";
        return this.sendRawMessage(model.chatId, `${msgPrefix}🗣 ${text}`);
      })
      .then(() => {
        logger.info(`${prefix.getPrefix()} Voice successfully converted`);
        return this.updateUsageCount(model, prefix);
      })
      .catch((err) => {
        const errorMessage = "Unable to recognize the file";
        logger.error(
          `${prefix.getPrefix()} ${errorMessage} ${Logger.y(
            model.voiceFileId
          )}`,
          err
        );
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
          prefix
        );
      })
      .catch((err) => {
        const errorMessage =
          "Unable to send a message that file is unable to recognize";
        logger.error(
          `${prefix.getPrefix()} ${errorMessage} ${Logger.y(
            model.voiceFileId
          )}`,
          err
        );
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
      prefix
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
