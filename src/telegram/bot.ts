import TelegramBot from "node-telegram-bot-api";
import { Logger } from "../logger";
import { LanguageCode, VoiceConverter } from "../recognition/types";
import { StatisticApi } from "../statistic";
import { TextModel } from "../text";
import { LabelId } from "../text/labels";
import { githubUrl } from "../const";
import { BotMessageModel, MessageOptions } from "./types";
import {
  isHelloMessage,
  isLangMessage,
  isMessageSupported,
  isSupportMessage,
  isVoiceMessage,
  isVoiceMessageLong,
} from "./helpers";
import { runPromiseWithRetry } from "../common/helpers";
import { getMd5Hash } from "../common/hash";

const logger = new Logger("telegram-bot");

export class TelegramBotModel {
  private readonly bot: TelegramBot;
  private readonly text = new TextModel();
  private id = "";
  private host = "";
  private path = "";
  private authorUrl = "";

  constructor(
    private readonly token: string,
    private readonly converter: VoiceConverter,
    private readonly stat: StatisticApi
  ) {
    this.bot = new TelegramBot(this.token);
    this.bot.on("message", (msg) => this.handleMessage(msg));
    this.bot.on("callback_query", (msg) => this.handleCallbackQuery(msg));
  }

  public setHostLocation(host: string, path = "/bot/message"): this {
    this.host = host;
    this.path = path;
    this.id = getMd5Hash(`${this.host}${this.path}:${this.token}`);
    return this;
  }

  public setAuthor(url: string): this {
    this.authorUrl = url;
    return this;
  }

  public applyHostLocation(): Promise<void> {
    const hookUrl = `${this.host}${this.getPath()}`;
    logger.warn(`WebHook url is ${hookUrl}`);
    return runPromiseWithRetry("bot.applyHostLocation", () =>
      this.bot.setWebHook(hookUrl)
    );
  }

  public getHostLocation(): Promise<string> {
    return this.bot.getWebHookInfo().then((info) => info.url);
  }

  public getPath(): string {
    return `${this.path}/${this.id}`;
  }

  public handleApiMessage(message: TelegramBot.Update): void {
    this.bot.processUpdate(message);
  }

  private handleMessage(msg: TelegramBot.Message): Promise<void> {
    const model = new BotMessageModel(msg);

    logger.info(`${model.id} Incoming message for chatId=${model.chatId}`);

    if (!isMessageSupported(msg)) {
      return this.logNotSupportedMessage(model);
    }

    if (isHelloMessage(model, msg)) {
      return this.sendHelloMessage(model);
    }

    if (isLangMessage(model, msg)) {
      return this.showLanguageSelection(model);
    }

    if (isSupportMessage(model, msg)) {
      return this.sendSupportMessage(model);
    }

    if (!isVoiceMessage(msg)) {
      return this.sendNoVoiceMessage(model);
    }

    if (isVoiceMessageLong(model)) {
      logger.warn(
        `${model.id} Message is too long duration=${model.voiceDuration} sec for chatId=${model.chatId}`
      );
      return this.sendVoiceMessageTooLong(model);
    }

    logger.info(`${model.id} Voice message for chatId=${model.chatId}`);
    return this.getChatLanguage(model).then((lang) =>
      this.recogniseVoiceMessage(model, lang)
    );
  }

  private logNotSupportedMessage(model: BotMessageModel): Promise<void> {
    logger.warn(
      `${model.id} Message is not supported for chatId=${model.chatId}`
    );
    return Promise.resolve();
  }

  private sendVoiceMessageTooLong(model: BotMessageModel): Promise<void> {
    if (model.isGroup) {
      logger.info(`${model.id} Voice is too long for chatId=${model.chatId}`);
      return Promise.resolve();
    }
    logger.info(
      `${model.id} Sending voice is too long for chatId=${model.chatId}`
    );
    return this.getChatLanguage(model)
      .then((lang) =>
        this.sendMessage(model.id, model.chatId, LabelId.LongVoiceMessage, {
          lang,
        })
      )
      .catch((err) =>
        logger.error(
          `${model.id} Unable to send voice is too long for chatId=${model.chatId}`,
          err
        )
      );
  }

  private sendNoVoiceMessage(model: BotMessageModel): Promise<void> {
    if (model.isGroup) {
      logger.info(`${model.id} no content for chatId=${model.chatId}`);
      return Promise.resolve();
    }
    logger.info(`${model.id} Sending no content for chatId=${model.chatId}`);
    return this.getChatLanguage(model)
      .then((lang) =>
        this.sendMessage(model.id, model.chatId, LabelId.NoContent, { lang })
      )
      .catch((err) =>
        logger.error(
          `${model.id} Unable to send no content for chatId=${model.chatId}`,
          err
        )
      );
  }

  private sendHelloMessage(model: BotMessageModel): Promise<void> {
    logger.info(`${model.id} Sending hello message for chatId=${model.chatId}`);
    return this.getChatLanguage(model)
      .then((lang) =>
        this.sendMessage(
          model.id,
          model.chatId,
          [
            LabelId.WelcomeMessage,
            LabelId.WelcomeMessageGroup,
            LabelId.WelcomeMessageMore,
          ],
          { lang }
        )
      )
      .catch((err) =>
        logger.error(
          `${model.id} Unable to send hello for chatId=${model.chatId}`,
          err
        )
      );
  }

  private sendInProgressMessage(
    model: BotMessageModel,
    lang: LanguageCode
  ): Promise<void> {
    if (model.isGroup) {
      return Promise.resolve();
    }

    return this.sendMessage(model.id, model.chatId, LabelId.InProgress, {
      lang,
    });
  }

  private sendSupportMessage(model: BotMessageModel): Promise<void> {
    logger.info(
      `${model.id} Sending support message for chatId=${model.chatId}`
    );
    return this.getChatLanguage(model)
      .then((lang) => {
        const buttons: TelegramBot.InlineKeyboardButton[] = [];
        buttons.push({
          text: this.text.t(LabelId.GithubIssues, lang),
          url: githubUrl,
        });

        if (this.authorUrl) {
          buttons.push({
            text: this.text.t(LabelId.ContactAuthor, lang),
            url: this.authorUrl,
          });
        }

        return this.sendMessage(
          model.id,
          model.chatId,
          LabelId.SupportCommand,
          {
            lang,
            options: {
              reply_markup: {
                inline_keyboard: [buttons],
              },
            },
          }
        );
      })
      .catch((err) =>
        logger.error(
          `${model.id} Unable to send support message for chatId=${model.chatId}`,
          err
        )
      );
  }

  private sendRawMessage(
    chatId: number,
    message: string,
    options?: TelegramBot.SendMessageOptions
  ): Promise<void> {
    return this.bot.sendMessage(chatId, message, options).then(() => {
      // Empty promise result
    });
  }

  private sendMessage(
    messageId: number,
    chatId: number,
    ids: LabelId | LabelId[],
    meta: MessageOptions
  ): Promise<void> {
    const msgs = Array.isArray(ids) ? ids : [ids];
    if (!msgs.length) {
      return Promise.resolve();
    }

    const part = msgs.shift();
    if (!part) {
      return Promise.resolve();
    }

    logger.info(`${messageId} Sending message for chatId=${chatId}`);
    return this.sendRawMessage(
      chatId,
      this.text.t(part, meta.lang),
      meta.options
    )
      .then(() => this.sendMessage(messageId, chatId, msgs, meta))
      .catch((err) =>
        logger.error(
          `${messageId} Unable to send the message for chatId=${chatId}`,
          err
        )
      );
  }

  private editMessage(
    chatId: number,
    lang: LanguageCode,
    messageId: number,
    id: LabelId
  ): Promise<void> {
    return this.bot
      .editMessageText(this.text.t(id, lang), {
        chat_id: chatId,
        message_id: messageId,
      })
      .then(() => {
        logger.info(`${messageId} Updated message for chatId=${chatId}`);
      })
      .catch((err) =>
        logger.error(`Unable to edit the message for chatId=${chatId}`, err)
      );
  }

  private getFileLInk(model: BotMessageModel) {
    logger.info(`${model.id} Fetching file link for chatId=${model.chatId}`);
    if (!model.voiceFileId) {
      return Promise.reject(
        new Error("Unable to find a voice file in the message")
      );
    }

    return this.bot.getFileLink(model.voiceFileId);
  }

  private showLanguageSelection(model: BotMessageModel): Promise<void> {
    logger.info(
      `${model.id} Sending language selection message for chatId=${model.chatId}`
    );
    return this.getChatLanguage(model)
      .then((lang) =>
        this.sendMessage(model.id, model.chatId, LabelId.ChangeLangTitle, {
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
        })
      )
      .catch((err) =>
        logger.error(
          `${model.id} Unable to send language selector for chatId=${model.chatId}`,
          err
        )
      );
  }

  private handleCallbackQuery(msg: TelegramBot.CallbackQuery): void {
    const message = msg.message;
    if (!message) {
      const msgError = new Error("No message passed in callback query");
      logger.error(msgError.message, msgError);
      return;
    }
    const id = message.message_id;
    const chatId = message.chat.id;
    const lang =
      msg.data === LanguageCode.En ? LanguageCode.En : LanguageCode.Ru;

    logger.info(`${id} Updating language for chatId=${chatId}`);
    this.stat.usage
      .updateLanguage(chatId, lang)
      .then(() => this.editMessage(chatId, lang, id, LabelId.ChangeLang))
      .catch((err) => {
        this.sendMessage(id, chatId, LabelId.UpdateLanguageError, { lang });
        logger.error(
          `${id} Unable to set the language for chatId=${logger.y(
            chatId
          )} lang=${logger.y(lang)}`,
          err
        );
      });
  }

  private recogniseVoiceMessage(
    model: BotMessageModel,
    lang: LanguageCode
  ): Promise<void> {
    logger.info(`${model.id} Processing voice for chatId=${model.chatId}`);
    return this.getFileLInk(model)
      .then((fileLink) => {
        this.sendInProgressMessage(model, lang);

        return this.converter.transformToText(
          fileLink,
          model.voiceFileId,
          lang
        );
      })
      .then((text: string) => {
        const name = model.fullUserName || model.userName;
        const prefix = model.isGroup && name ? `${name} ` : "";
        return Promise.all([
          this.sendRawMessage(model.chatId, `${prefix}🗣 ${text}`),
          this.updateUsageCount(model),
        ]);
      })
      .then(() => {
        logger.info(
          `${model.id} voice successfully converted for chatId=${model.chatId}`
        );
      })
      .catch((err: Error) => {
        if (!model.isGroup) {
          this.sendMessage(model.id, model.chatId, LabelId.RecognitionFailed, {
            lang,
          });
        }
        logger.error(
          `${model.id} Unable to recognize the file ${logger.y(
            model.voiceFileId
          )} for chatId=${model.chatId}`,
          err
        );
      });
  }

  private updateUsageCount(model: BotMessageModel): Promise<void> {
    logger.info(`${model.id} Updating usage for chatId=${model.chatId}`);
    return this.stat.usage
      .updateUsageCount(model.chatId, model.name)
      .catch((err) =>
        logger.error(
          `${model.id} Unable to update stat count for chatId=${model.chatId}`,
          err
        )
      );
  }

  private getChatLanguage(
    model: BotMessageModel,
    lang?: LanguageCode
  ): Promise<LanguageCode> {
    if (lang) {
      return Promise.resolve(lang);
    }

    logger.info(`${model.id} Fetching language for chatId=${model.chatId}`);
    return this.stat.usage
      .getLanguage(model.chatId, model.name)
      .catch((err) => {
        logger.error(
          `${model.id} Unable to get the lang for chatId=${model.chatId}`,
          err
        );
        return this.text.fallbackLanguage;
      });
  }
}
