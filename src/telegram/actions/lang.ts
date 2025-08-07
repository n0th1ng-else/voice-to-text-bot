import { GenericAction } from "./common.js";
import { BotLangData, TelegramButtonModel } from "../types.js";
import { BotCommand } from "../commands.js";
import { isCommandMessage } from "../commandsChecker.js";
import { TelegramMessagePrefix } from "../models/messagePrefix.js";
import { BotMessageModel } from "../models/botMessage.js";
import { getLanguageByText, getRawUserLanguage } from "../helpers.js";
import { type TranslationKey, TranslationKeys } from "../../text/types.js";
import { Logger } from "../../logger/index.js";
import { collectAnalytics } from "../../analytics/index.js";
import { isMessageNotModified } from "../api/tgerror.js";
import type { TgCallbackQuery, TgMessage } from "../api/types.js";
import {
  type LanguageCode,
  SUPPORTED_LANGUAGES,
} from "../../recognition/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";
import type { ChatId, MessageId, MessageThreadId } from "../api/core.js";
import type { TgInlineKeyboardButton } from "../api/groups/chats/chats-types.js";
import { trackUserActivity } from "../../monitoring/newrelic.js";

const logger = new Logger("telegram-bot");

const getLanguageButton = (
  lang: LanguageCode,
  logPrefix: string,
): TelegramButtonModel => {
  return new TelegramButtonModel<LanguageCode>("l", lang, logPrefix);
};

const languageButtonLabel: Record<LanguageCode, TranslationKey> = {
  "en-US": TranslationKeys.BtnEnglish,
  "ru-RU": TranslationKeys.BtnRussian,
};

export class LangAction extends GenericAction {
  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    trackUserActivity({ activityType: "lang" }, mdl.userId);
    return this.showLanguageSelection(mdl, prefix);
  }

  public async runCondition(
    msg: TgMessage,
    mdl: BotMessageModel,
  ): Promise<boolean> {
    const isLangMessage = isCommandMessage(mdl, msg, BotCommand.Language);
    return Promise.resolve(isLangMessage);
  }

  public async runCallback(
    msg: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData,
    query: TgCallbackQuery,
  ): Promise<void> {
    analytics.addPageVisit();
    return await this.handleLanguageChange(msg, button, analytics, query);
  }

  private async handleLanguageChange(
    message: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData,
    msg: TgCallbackQuery,
  ): Promise<void> {
    const model = new BotMessageModel(message, analytics);

    analytics.setId(model.chatId).setLang(getRawUserLanguage(msg));

    const opts = await this.getLangData(model.chatId, button);
    await this.updateLanguage(
      opts,
      model.chatId,
      model.id,
      analytics,
      model.forumThreadId,
    );
    await collectAnalytics(
      analytics.setCommand(BotCommand.Language, "Language message", "Callback"),
    );
  }

  private updateLanguage(
    opts: BotLangData,
    chatId: ChatId,
    messageId: MessageId,
    analytics: AnalyticsData,
    forumThreadId?: MessageThreadId,
  ): Promise<void> {
    const lang = opts.langId;
    const prefix = opts.prefix;

    return this.stat
      .updateLanguage(chatId, lang)
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
          chatId,
          [TranslationKeys.UpdateLanguageError],
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
    chatId: ChatId,
    lang: LanguageCode,
    messageId: MessageId,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    return this.editMessage(
      chatId,
      messageId,
      { lang },
      TranslationKeys.ChangeLang,
      prefix,
    )
      .catch((err) => {
        if (isMessageNotModified(err)) {
          logger.warn(
            `${prefix.getPrefix()} Unable to edit language selector. Most likely it is already updated but the user clicked button multiple times`,
            err,
            true,
          );

          return;
        }
        throw err;
      })
      .then(() => logger.info(`${prefix.getPrefix()} Language updated`));
  }

  private getLangData(
    chatId: ChatId,
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
        const buttons = SUPPORTED_LANGUAGES.map((supportedLanguage) => {
          const data = getLanguageButton(supportedLanguage, prefix.id);

          const label = languageButtonLabel[supportedLanguage];
          const btn: TgInlineKeyboardButton = {
            text: this.text.t(label, lang),
            callback_data: data.getDtoString(),
          };

          return [btn];
        });

        return this.sendMessage(
          model.chatId,
          [TranslationKeys.ChangeLangTitle],
          {
            lang,
            options: {
              buttons,
            },
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
