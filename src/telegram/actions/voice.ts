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
        this.sendInProgressMessage(model, lang, prefix);

        if (!this.converter) {
          return Promise.reject(new Error("Voice converter is not set!"));
        }

        return this.converter.transformToText(
          fileLink,
          model.voiceFileId,
          lang
        );
      })
      .then((text: string) => {
        const name = model.fullUserName || model.userName;
        const msgPrefix = model.isGroup && name ? `${name} ` : "";
        return Promise.all([
          this.sendRawMessage(model.chatId, `${msgPrefix}🗣 ${text}`),
          this.updateUsageCount(model, prefix),
        ]);
      })
      .then(() =>
        logger.info(`${prefix.getPrefix()} Voice successfully converted`)
      )
      .catch((err: Error) => {
        if (!model.isGroup) {
          this.sendMessage(
            model.id,
            model.chatId,
            LabelId.RecognitionFailed,
            {
              lang,
            },
            prefix
          );
        }

        logger.error(
          `${prefix.getPrefix()} Unable to recognize the file ${Logger.y(
            model.voiceFileId
          )}`,
          err
        );
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
    );
  }

  private updateUsageCount(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Updating usage count`);

    return this.stat.usages
      .updateUsageCount(model.chatId, model.name, model.userLanguage)
      .then(() => logger.info(`${prefix.getPrefix()} Usage count updated`))
      .catch((err) =>
        logger.error(`${prefix.getPrefix()} Unable to update usage count`, err)
      );
  }
}
