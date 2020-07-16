import { TgCallbackQuery, TgMessage } from "../api/types";
import { GenericAction } from "./common";
import {
  BotButtonData,
  BotLangData,
  BotMessageModel,
  TelegramMessagePrefix,
} from "../types";
import { isLangMessage } from "../helpers";
import { LabelId } from "../../text/labels";
import { LanguageCode } from "../../recognition/types";
import { Logger } from "../../logger";

const logger = new Logger("telegram-bot");

export class LangAction extends GenericAction {
  public runAction(
    msg: TgMessage,
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    return this.showLanguageSelection(mdl, prefix);
  }

  public runCondition(msg: TgMessage, mdl: BotMessageModel): boolean {
    return isLangMessage(mdl, msg);
  }

  public handleLanguageChange(msg: TgCallbackQuery): void {
    const message = msg.message;
    if (!message) {
      const msgError = new Error("No message passed in callback query");
      logger.error(msgError.message, msgError);
      return;
    }
    const messageId = message.message_id;
    const chatId = message.chat.id;

    this.getLangData(chatId, msg.data).then((opts) =>
      this.updateLanguage(opts, chatId, messageId)
    );
  }

  private updateLanguage(
    opts: BotLangData,
    chatId: number,
    messageId: number
  ): Promise<void> {
    const lang = opts.langId;
    const prefix = opts.prefix;

    return this.stat.usage
      .updateLanguage(chatId, lang)
      .then(() =>
        this.editMessage(chatId, lang, messageId, LabelId.ChangeLang, prefix)
      )
      .then(() => logger.info(`${prefix.getPrefix()} Language updated`))
      .catch((err) => {
        this.sendMessage(
          messageId,
          chatId,
          LabelId.UpdateLanguageError,
          { lang },
          prefix
        );
        logger.error(
          `${prefix.getPrefix()} Unable to set the language lang=${Logger.y(
            lang
          )}`,
          err
        );
      });
  }

  private getLangData(chatId: number, data?: string): Promise<BotLangData> {
    if (!data) {
      return Promise.reject(
        new Error("No callback data received. Unable to handle language change")
      );
    }

    try {
      const obj: BotButtonData = JSON.parse(data);

      const prefixId = obj.i || undefined;

      let langId: LanguageCode | undefined;

      if (obj.l === LanguageCode.En) {
        langId = LanguageCode.En;
      }

      if (obj.l === LanguageCode.Ru) {
        langId = LanguageCode.Ru;
      }

      if (!langId) {
        return Promise.reject(new Error("New language code is not recognized"));
      }

      const prefix = new TelegramMessagePrefix(chatId, prefixId);
      return Promise.resolve(new BotLangData(langId, prefix));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  private showLanguageSelection(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending language selection message`);

    return this.getChatLanguage(model, prefix)
      .then((lang) => {
        const EnData = prefix.getDto(LanguageCode.En);
        const RuData = prefix.getDto(LanguageCode.Ru);

        return this.sendMessage(
          model.id,
          model.chatId,
          LabelId.ChangeLangTitle,
          {
            lang,
            options: [
              [
                {
                  text: this.text.t(LabelId.BtnRussian, lang),
                  callback_data: JSON.stringify(RuData),
                },
              ],
              [
                {
                  text: this.text.t(LabelId.BtnEnglish, lang),
                  callback_data: JSON.stringify(EnData),
                },
              ],
            ],
          },
          prefix
        );
      })
      .then(() => logger.info(`${prefix.getPrefix()} Language selector sent`))
      .catch((err) =>
        logger.error(
          `${prefix.getPrefix()} Unable to send language selector`,
          err
        )
      );
  }
}
