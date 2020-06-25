import TelegramBot from "node-telegram-bot-api";
import { GenericAction } from "./common";
import { BotMessageModel } from "../types";
import { isLangMessage } from "../helpers";
import { LabelId } from "../../text/labels";
import { LanguageCode } from "../../recognition/types";
import { Logger } from "../../logger";

const logger = new Logger("telegram-bot");

export class LangAction extends GenericAction {
  public runAction(
    msg: TelegramBot.Message,
    mdl: BotMessageModel,
    prefix: string
  ): Promise<void> {
    return this.showLanguageSelection(mdl, prefix);
  }

  public runCondition(msg: TelegramBot.Message, mdl: BotMessageModel): boolean {
    return isLangMessage(mdl, msg);
  }

  public handleLanguageChange(msg: TelegramBot.CallbackQuery): void {
    const message = msg.message;
    if (!message) {
      const msgError = new Error("No message passed in callback query");
      logger.error(msgError.message, msgError);
      return;
    }
    const id = message.message_id;
    const chatId = message.chat.id;
    const prefix = `[${id}] [ChatId=${chatId}]`;
    const lang =
      msg.data === LanguageCode.En ? LanguageCode.En : LanguageCode.Ru;

    logger.info(`${prefix} Updating language`);
    this.stat.usage
      .updateLanguage(chatId, lang)
      .then(() =>
        this.editMessage(chatId, lang, id, LabelId.ChangeLang, prefix)
      )
      .then(() => logger.info(`${prefix} Language updated`))
      .catch((err) => {
        this.sendMessage(
          id,
          chatId,
          LabelId.UpdateLanguageError,
          { lang },
          prefix
        );
        logger.error(
          `${prefix} Unable to set the language lang=${logger.y(lang)}`,
          err
        );
      });
  }

  private showLanguageSelection(
    model: BotMessageModel,
    prefix: string
  ): Promise<void> {
    logger.info(`${prefix} Sending language selection message`);

    return this.getChatLanguage(model, prefix)
      .then((lang) =>
        this.sendMessage(
          model.id,
          model.chatId,
          LabelId.ChangeLangTitle,
          {
            lang,
            options: {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: this.text.t(LabelId.BtnRussian, lang),
                      callback_data: LanguageCode.Ru,
                    },
                  ],
                  [
                    {
                      text: this.text.t(LabelId.BtnEnglish, lang),
                      callback_data: LanguageCode.En,
                    },
                  ],
                ],
              },
            },
          },
          prefix
        )
      )
      .then(() => logger.info(`${prefix} Language selector sent`))
      .catch((err) =>
        logger.error(`${prefix} Unable to send language selector`, err)
      );
  }
}
