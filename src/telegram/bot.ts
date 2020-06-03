import { createHash } from "crypto";
import TelegramBot from "node-telegram-bot-api";
import { Logger } from "../logger";
import { LanguageCode, VoiceConverter } from "../recognition/types";
import { StatisticApi } from "../statistic";
import { TextModel } from "../text";
import { LabelId } from "../text/labels";
import { githubUrl } from "../const";
import { BotMessageModel } from "./types";
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
    this.id = createHash("md5")
      .update(`${this.host}${this.path}:${this.token}`)
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

  private handleMessage(msg: TelegramBot.Message): void {
    const model = new BotMessageModel(msg);

    if (!model.isMessageSupported) {
      logger.warn("Message is not supported");
      return;
    }

    this.stat.usage
      .getLanguage(model.chatId, model.username)
      .then((lang) => this.text.setLanguage(lang))
      .catch((err) => {
        logger.error("Unable to get the lang", err);
        this.text.resetLanguage();
      })
      .then(() => {
        if (isHelloMessage(msg)) {
          this.sendHelloMessage(model.chatId);
          return;
        }

        if (isLangMessage(msg)) {
          this.showLanguageSelection(model.chatId);
          return;
        }

        if (isSupportMessage(msg)) {
          this.sendSupportMessage(model.chatId);
          return;
        }

        if (!isVoiceMessage(msg)) {
          if (!model.isGroup) {
            this.sendMessage(model.chatId, LabelId.NoContent);
          }
          return;
        }

        if (isVoiceMessageLong(model)) {
          logger.warn(`Message is too long ${model.voiceDuration} sec`);
          if (!model.isGroup) {
            this.sendMessage(model.chatId, LabelId.LongVoiceMessage);
          }
          return;
        }

        this.stat.usage
          .updateUsageCount(model.chatId)
          .catch((err) => logger.error("Unable to update stat count", err));

        this.getFileLInk(model)
          .then((fileLink) => {
            logger.warn("New link", logger.y(fileLink));
            if (!model.isGroup) {
              this.sendMessage(model.chatId, LabelId.InProgress);
            }

            return this.converter.transformToText(
              fileLink,
              model.voiceFileId,
              this.text.getLanguage()
            );
          })
          .then((text: string) =>
            this.bot.sendMessage(model.chatId, `🗣 ${text}`)
          )
          .catch((err: Error) => {
            if (!model.isGroup) {
              this.sendMessage(model.chatId, LabelId.RecognitionFailed);
            }
            logger.error(
              `Unable to recognize the file ${logger.y(model.voiceFileId)}`,
              err
            );
          });
      });
  }

  private sendHelloMessage(chatId: number): void {
    this.sendMessage(chatId, [
      LabelId.WelcomeMessage,
      LabelId.WelcomeMessageMore,
    ]);
  }

  private sendSupportMessage(chatId: number): void {
    const buttons = [];
    buttons.push({
      text: this.text.t(LabelId.GithubIssues),
      url: githubUrl,
    });

    if (this.authorUrl) {
      buttons.push({
        text: this.text.t(LabelId.ContactAuthor),
        url: this.authorUrl,
      });
    }
    this.bot
      .sendMessage(chatId, this.text.t(LabelId.SupportCommand), {
        reply_markup: {
          inline_keyboard: [buttons],
        },
      })
      .catch((err) => logger.error("Unable to send support message", err));
  }

  private sendMessage(chatId: number, ids: LabelId | LabelId[]): Promise<void> {
    const msgs = Array.isArray(ids) ? ids : [ids];
    if (!msgs.length) {
      return Promise.resolve();
    }

    const part = msgs.shift();
    if (!part) {
      return Promise.resolve();
    }

    return this.bot
      .sendMessage(chatId, this.text.t(part))
      .then(() => this.sendMessage(chatId, msgs))
      .catch((err) => logger.error("Unable to send a message", err));
  }

  private editMessage(
    chatId: number,
    messageId: number,
    id: LabelId
  ): Promise<void> {
    return this.bot
      .editMessageText(this.text.t(id), {
        chat_id: chatId,
        message_id: messageId,
      })
      .then(() => {
        // Empty promise result
      })
      .catch((err) => logger.error("Unable to edit the message", err));
  }

  private getFileLInk(model: BotMessageModel) {
    if (!model.voiceFileId) {
      return Promise.reject(
        new Error("Unable to find a voice file in the message")
      );
    }

    return this.bot.getFileLink(model.voiceFileId);
  }

  private showLanguageSelection(chatId: number): void {
    this.bot
      .sendMessage(chatId, this.text.t(LabelId.ChangeLangTitle), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: this.text.t(LabelId.BtnRussian),
                callback_data: LanguageCode.Ru,
              },
            ],
            [
              {
                text: this.text.t(LabelId.BtnEnglish),
                callback_data: LanguageCode.En,
              },
            ],
          ],
        },
      })
      .catch((err) => logger.error("Unable to send language selector", err));
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
      .then(() => {
        this.text.setLanguage(lang);
        return this.editMessage(chatId, message.message_id, LabelId.ChangeLang);
      })
      .catch((err) =>
        logger.error(
          `Unable to set the language for chatId=${logger.y(
            chatId
          )} lang=${logger.y(lang)}`,
          err
        )
      );
  }
}
