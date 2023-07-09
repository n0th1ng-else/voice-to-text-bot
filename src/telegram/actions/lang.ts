import { TgCallbackQuery, TgMessage } from "../api/types.js";
import { GenericAction } from "./common.js";
import {
  BotCommand,
  BotLangData,
  BotMessageModel,
  TelegramButtonModel,
  TelegramMessagePrefix,
} from "../types.js";
import {
  getLanguageByText,
  getRawUserLanguage,
  isLangMessage,
} from "../helpers.js";
import { LabelId } from "../../text/labels.js";
import type { LanguageCode } from "../../recognition/types.js";
import { Logger } from "../../logger/index.js";
import { AnalyticsData } from "../../analytics/ga/types.js";
import { collectAnalytics } from "../../analytics/index.js";
import { isMessageNotModified } from "../api/tgerror.js";

const logger = new Logger("telegram-bot");

export class LangAction extends GenericAction {
  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    return this.showLanguageSelection(mdl, prefix);
  }

  public runCondition(msg: TgMessage, mdl: BotMessageModel): boolean {
    return isLangMessage(mdl, msg);
  }

  public runCallback(
    msg: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData,
    query: TgCallbackQuery,
  ): Promise<void> {
    analytics.addPageVisit();
    return this.handleLanguageChange(msg, button, analytics, query);
  }

  private handleLanguageChange(
    message: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData,
    msg: TgCallbackQuery,
  ): Promise<void> {
    const messageId = message.message_id;
    const chatId = message.chat.id;
    let forumThreadId: number | undefined;
    if (message.is_topic_message && message.message_thread_id) {
      forumThreadId = message.message_thread_id;
    }
    analytics.setId(chatId).setLang(getRawUserLanguage(msg));

    return this.getLangData(chatId, button)
      .then((opts) =>
        this.updateLanguage(opts, chatId, messageId, analytics, forumThreadId),
      )
      .then(() =>
        collectAnalytics(
          analytics.setCommand(
            BotCommand.Language,
            "Language message",
            "Callback",
          ),
        ),
      );
  }

  private updateLanguage(
    opts: BotLangData,
    chatId: number,
    messageId: number,
    analytics: AnalyticsData,
    forumThreadId?: number,
  ): Promise<void> {
    const lang = opts.langId;
    const prefix = opts.prefix;

    return this.stat.usages
      .updateLangId(chatId, lang)
      .then(() => {
        logger.info(`${prefix.getPrefix()} Language updated in DB`);
        return true;
      })
      .catch((err) => {
        const errorMessage = "Unable to set the language in DB";
        logger.error(
          `${prefix.getPrefix()} ${errorMessage} lang=${Logger.y(lang)}`,
          err,
        );
        analytics.addError(errorMessage);
        return false;
      })
      .then((isLangUpdated) => {
        if (isLangUpdated) {
          return this.updateLangMessage(chatId, lang, messageId, prefix);
        }

        return this.sendMessage(
          messageId,
          chatId,
          LabelId.UpdateLanguageError,
          { lang },
          prefix,
          forumThreadId,
        );
      })
      .catch((err) => {
        const errorMessage = "Unable to send the language update message";
        logger.error(
          `${prefix.getPrefix()} ${errorMessage} lang=${Logger.y(lang)}`,
          err,
        );
        analytics.addError(errorMessage);
      });
  }

  private updateLangMessage(
    chatId: number,
    lang: LanguageCode,
    messageId: number,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    return this.editMessage(
      chatId,
      messageId,
      { lang },
      LabelId.ChangeLang,
      prefix,
    )
      .catch((err) => {
        if (isMessageNotModified(err)) {
          return logger.warn(
            `${prefix.getPrefix()} Unable to edit language selector. Most likely it is already updated but the user clicked button multiple times`,
            err,
          );
        }
        throw err;
      })
      .then(() => logger.info(`${prefix.getPrefix()} Language updated`));
  }

  private getLangData(
    chatId: number,
    button: TelegramButtonModel,
  ): Promise<BotLangData> {
    if (!button.value) {
      return Promise.reject(
        new Error(
          "No language data received. Unable to handle language change",
        ),
      );
    }

    return Promise.resolve().then(() => {
      const prefix = new TelegramMessagePrefix(chatId, button.logPrefix);
      const throwOnError = true;
      const langId = getLanguageByText(button.value, throwOnError);
      return new BotLangData(langId, prefix);
    });
  }

  private showLanguageSelection(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending language selection message`);

    return this.getChatLanguage(model, prefix)
      .then((lang) => {
        const EnData = new TelegramButtonModel("l", "en-US", prefix.id);
        const RuData = new TelegramButtonModel("l", "ru-RU", prefix.id);

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
                  callback_data: RuData.getDtoString(),
                },
              ],
              [
                {
                  text: this.text.t(LabelId.BtnEnglish, lang),
                  callback_data: EnData.getDtoString(),
                },
              ],
            ],
          },
          prefix,
          model.forumThreadId,
        );
      })
      .then(() => logger.info(`${prefix.getPrefix()} Language selector sent`))
      .catch((err) => {
        const errorMessage = "Unable to send language selector";
        logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
        model.analytics.addError(errorMessage);
      })
      .then(() =>
        collectAnalytics(
          model.analytics.setCommand(
            BotCommand.Language,
            "Language message",
            "Init",
          ),
        ),
      );
  }
}
