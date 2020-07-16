import { TgMessage } from "../api/types";
import { GenericAction } from "./common";
import { BotMessageModel, TelegramMessagePrefix } from "../types";
import { isVoiceMessage, isVoiceMessageLong } from "../helpers";
import { Logger } from "../../logger";
import { LabelId } from "../../text/labels";
import { LanguageCode, VoiceConverter } from "../../recognition/types";

const logger = new Logger("telegram-bot");

export class VoiceAction extends GenericAction {
  private converter?: VoiceConverter;

  public runAction(
    msg: TgMessage,
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    if (isVoiceMessageLong(mdl)) {
      logger.warn(
        `${prefix.getPrefix()} Message is too long duration=${
          mdl.voiceDuration
        }s`
      );
      return this.sendVoiceMessageTooLong(mdl, prefix);
    }

    logger.info(`${prefix.getPrefix()} Voice message`);
    return this.getChatLanguage(mdl, prefix).then((lang) =>
      this.recogniseVoiceMessage(mdl, lang, prefix)
    );
  }

  public runCondition(msg: TgMessage): boolean {
    return isVoiceMessage(msg);
  }

  public setConverter(converter: VoiceConverter): void {
    this.converter = converter;
  }

  private sendVoiceMessageTooLong(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    if (model.isGroup) {
      logger.info(`${prefix.getPrefix()} Voice is too long`);
      return Promise.resolve();
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
      .catch((err) =>
        logger.error(
          `${prefix.getPrefix()} Unable to send voice is too long`,
          err
        )
      );
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

    return this.stat.usage
      .updateUsageCount(model.chatId, model.name, model.userLanguage)
      .then(() => logger.info(`${prefix.getPrefix()} Usage count updated`))
      .catch((err) =>
        logger.error(`${prefix.getPrefix()} Unable to update usage count`, err)
      );
  }
}
