import { TgCallbackQuery, TgMessage } from "../api/types";
import { GenericAction } from "./common";
import {
  BotButtonData,
  BotCommand,
  BotLangData,
  BotMessageModel,
  TelegramMessagePrefix,
} from "../types";
import { getRawUserLanguage, isLangMessage } from "../helpers";
import { LabelId } from "../../text/labels";
import { LanguageCode } from "../../recognition/types";
import { Logger } from "../../logger";
import { AnalyticsData } from "../../analytics/api/types";
import { collectAnalytics } from "../../analytics";

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

  public handleLanguageChange(
    msg: TgCallbackQuery,
    analytics: AnalyticsData
  ): void {
    const message = msg.message;
    if (!message) {
      const msgError = new Error("No message passed in callback query");
      logger.error(msgError.message, msgError);
      return;
    }
    const messageId = message.message_id;
    const chatId = message.chat.id;
    analytics.setId(chatId).setLang(getRawUserLanguage(msg));

    this.getLangData(chatId, msg.data)
      .then((opts) => this.updateLanguage(opts, chatId, messageId, analytics))
      .then(() =>
        collectAnalytics(
          analytics.setCommand("Update language callback", BotCommand.Language)
        )
      );
  }

  private updateLanguage(
    opts: BotLangData,
    chatId: number,
    messageId: number,
    analytics: AnalyticsData
  ): Promise<void> {
    const lang = opts.langId;
    const prefix = opts.prefix;

    return this.stat.usages
      .updateLangId(chatId, lang)
      .then(() => logger.info(`${prefix.getPrefix()} Language updated in DB`))
      .then(
        () => this.sendLangUpdatedMessage(chatId, lang, messageId, prefix),
        (err) => {
          const errorMessage = "Unable to set the language in DB";
          logger.error(
            `${prefix.getPrefix()} ${errorMessage} lang=${Logger.y(lang)}`,
            err
          );
          analytics.setError(errorMessage);
          return this.sendMessage(
            messageId,
            chatId,
            LabelId.UpdateLanguageError,
            { lang },
            prefix
          );
        }
      )
      .catch((err) => {
        const errorMessage = "Unable to set the language";
        logger.error(
          `${prefix.getPrefix()} ${errorMessage} lang=${Logger.y(lang)}`,
          err
        );
        analytics.setError(errorMessage);
      });
  }

  private sendLangUpdatedMessage(
    chatId: number,
    lang: LanguageCode,
    messageId: number,
    prefix: TelegramMessagePrefix
  ): Promise<void> {
    return this.editMessage(
      chatId,
      lang,
      messageId,
      LabelId.ChangeLang,
      prefix
    ).then(() => logger.info(`${prefix.getPrefix()} Language updated`));
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
      .catch((err) => {
        const errorMessage = "Unable to send language selector";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.setError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand("Update language", BotCommand.Language)
        )
      );
  }
}
