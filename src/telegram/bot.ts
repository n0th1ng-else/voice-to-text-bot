import { createHash } from "crypto";
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
  isSupportMessage,
  isVoiceMessage,
  isVoiceMessageLong,
} from "./helpers";
import { runPromiseWithRetry } from "../common/helpers";

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
    const salt = new Date().getTime();
    this.id = createHash("md5")
      .update(`${this.host}${this.path}:${this.token}:${salt}`)
      .digest("hex");

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

    if (!model.isMessageSupported) {
      logger.warn(`Message is not supported for chatId=${model.chatId}`);
      return Promise.resolve();
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
      if (!model.isGroup) {
        return this.sendNoVoiceMessage(model);
      }

      return Promise.resolve();
    }

    if (isVoiceMessageLong(model)) {
      logger.warn(
        `Message is too long duration=${model.voiceDuration} sec for chatId=${model.chatId}`
      );
      if (!model.isGroup) {
        return this.sendVoiceMessageTooLong(model);
      }
      return Promise.resolve();
    }

    logger.info(`New voice message for chatId=${model.chatId}`);
    return this.getChatLanguage(model).then((lang) =>
      this.recogniseVoiceMessage(model, lang)
    );
  }

  private sendVoiceMessageTooLong(model: BotMessageModel): Promise<void> {
    return this.getChatLanguage(model).then((lang) =>
      this.sendMessage(model, LabelId.LongVoiceMessage, { lang })
    );
  }

  private sendNoVoiceMessage(model: BotMessageModel): Promise<void> {
    return this.getChatLanguage(model).then((lang) =>
      this.sendMessage(model, LabelId.NoContent, { lang })
    );
  }

  private sendHelloMessage(model: BotMessageModel): Promise<void> {
    return this.getChatLanguage(model).then((lang) =>
      this.sendMessage(
        model,
        [
          LabelId.WelcomeMessage,
          LabelId.WelcomeMessageGroup,
          LabelId.WelcomeMessageMore,
        ],
        { lang }
      )
    );
  }

  private sendSupportMessage(model: BotMessageModel): Promise<void> {
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

        return this.sendMessage(model, LabelId.SupportCommand, {
          lang,
          options: {
            reply_markup: {
              inline_keyboard: [buttons],
            },
          },
        });
      })
      .catch((err) =>
        logger.error(
          `Unable to send support message for chatId=${model.chatId}`,
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
    model: BotMessageModel,
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

    return this.sendRawMessage(
      model.chatId,
      this.text.t(part, meta.lang),
      meta.options
    )
      .then(() => this.sendMessage(model, msgs, meta))
      .catch((err) =>
        logger.error(
          `Unable to send the message for chatId=${model.chatId}`,
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
        // Empty promise result
      })
      .catch((err) =>
        logger.error(`Unable to edit the message for chatId=${chatId}`, err)
      );
  }

  private getFileLInk(model: BotMessageModel) {
    if (!model.voiceFileId) {
      return Promise.reject(
        new Error("Unable to find a voice file in the message")
      );
    }

    return this.bot.getFileLink(model.voiceFileId);
  }

  private showLanguageSelection(model: BotMessageModel): Promise<void> {
    return this.getChatLanguage(model)
      .then((lang) =>
        this.sendMessage(model, LabelId.ChangeLangTitle, {
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
          `Unable to send language selector for chatId=${model.chatId}`,
          err
        )
      );
  }

  private handleCallbackQuery(msg: TelegramBot.CallbackQuery): void {
    const message = msg.message;
    if (!message) {
      logger.error(
        "No message passed in callback query",
        new Error("No message passed in callback query")
      );
      return;
    }
    const chatId = message.chat.id;
    const lang =
      msg.data === LanguageCode.En ? LanguageCode.En : LanguageCode.Ru;

    this.stat.usage
      .updateLanguage(chatId, lang)
      .then(() =>
        this.editMessage(chatId, lang, message.message_id, LabelId.ChangeLang)
      )
      .catch((err) =>
        logger.error(
          `Unable to set the language for chatId=${logger.y(
            chatId
          )} lang=${logger.y(lang)}`,
          err
        )
      );
  }

  private recogniseVoiceMessage(
    model: BotMessageModel,
    lang: LanguageCode
  ): Promise<void> {
    return this.getFileLInk(model)
      .then((fileLink) => {
        logger.warn(`New link for chatId=${model.chatId}`, logger.y(fileLink));
        if (!model.isGroup) {
          this.sendMessage(model, LabelId.InProgress, { lang });
        }

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
        // Empty promise result
      })
      .catch((err: Error) => {
        if (!model.isGroup) {
          this.sendMessage(model, LabelId.RecognitionFailed, { lang });
        }
        logger.error(
          `Unable to recognize the file ${logger.y(
            model.voiceFileId
          )} for chatId=${model.chatId}`,
          err
        );
      });
  }

  private updateUsageCount(model: BotMessageModel): Promise<void> {
    return this.stat.usage
      .updateUsageCount(model.chatId, model.name)
      .catch((err) =>
        logger.error(
          `Unable to update stat count for chatId=${model.chatId}`,
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

    return this.stat.usage
      .getLanguage(model.chatId, model.name)
      .catch((err) => {
        logger.error(`Unable to get the lang for chatId=${model.chatId}`, err);
        return this.text.fallbackLanguage;
      });
  }
}
