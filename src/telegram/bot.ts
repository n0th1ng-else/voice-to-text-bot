import { createHash } from "crypto";
import TelegramBot from "node-telegram-bot-api";
import { Logger } from "../logger";
import { LanguageCode, VoiceConverter } from "../recognition/types";
import { StatisticApi } from "../statistic";
import { TextModel } from "../text";
import { LabelId } from "../text/labels";

const logger = new Logger("telegram-bot");

enum BotCommand {
  Start = "/start",
  Language = "/lang",
}

export class TelegramBotModel {
  private readonly bot: TelegramBot;
  private readonly text = new TextModel();
  private id = "";
  private host = "";
  private path = "";

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

  public applyHostLocation(): Promise<void> {
    const hookUrl = `${this.host}${this.getPath()}`;
    logger.warn(`webHook url is ${hookUrl}`);
    return this.bot.setWebHook(hookUrl);
  }

  public getPath(): string {
    return `${this.path}/${this.id}`;
  }

  public handleApiMessage(message: TelegramBot.Update): void {
    this.bot.processUpdate(message);
  }

  private handleMessage(msg: TelegramBot.Message): void {
    const chatId = msg.chat.id;
    this.stat
      .getLanguage(chatId)
      .then((lang) => this.text.setLanguage(lang))
      .catch((err) => {
        logger.error("Unable to get lang", err);
        this.text.resetLanguage();
      })
      .then(() => {
        if (this.isHelloMessage(msg)) {
          this.sendHelloMessage(chatId);
          return;
        }

        if (this.isLangMessage(msg)) {
          this.showLanguageSelection(chatId);
          return;
        }

        if (!this.isVoiceMessage(msg)) {
          this.sendMessage(chatId, LabelId.NoContent);
          return;
        }

        const fileName = (msg.voice && (msg.voice as any).file_unique_id) || "";

        this.stat
          .updateUsageCount(chatId)
          .catch((err) => logger.error("Unable to update stat count", err));

        this.getFileLInk(msg)
          .then((fileLink) => {
            logger.info("New link", fileLink);
            this.sendMessage(chatId, LabelId.InProgress);

            return this.converter.transformToText(fileLink, fileName);
          })
          .then((text: string) => this.bot.sendMessage(chatId, `🗣 ${text}`))
          .catch((err: Error) => {
            this.sendMessage(chatId, LabelId.RecognitionFailed);
            logger.error(err);
          });
      });
  }

  private isLangMessage(msg: TelegramBot.Message): boolean {
    return msg && msg.text === BotCommand.Language;
  }

  private isHelloMessage(msg: TelegramBot.Message): boolean {
    return msg && msg.text === BotCommand.Start;
  }

  private isVoiceMessage(msg: TelegramBot.Message): boolean {
    return msg && !!msg.voice;
  }

  private sendHelloMessage(chatId: number): void {
    this.sendMessage(chatId, LabelId.WelcomeMessage);
  }

  private sendMessage(chatId: number, id: LabelId): void {
    this.bot
      .sendMessage(chatId, this.text.t(id))
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

  private getFileLInk(msg: TelegramBot.Message) {
    const fileId = msg.voice && msg.voice.file_id;

    if (!fileId) {
      return Promise.reject(
        new Error("Unable to find a voice file in the message")
      );
    }

    return this.bot.getFileLink(fileId);
  }

  private showLanguageSelection(chatId: number): void {
    this.bot
      .sendMessage(chatId, "Select the language", {
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
      logger.error("No message passed in callback query");
      return;
    }
    const chatId = message.chat.id;
    const lang =
      msg.data === LanguageCode.En ? LanguageCode.En : LanguageCode.Ru;

    this.stat
      .updateLanguage(chatId, lang)
      .then(() => {
        this.text.setLanguage(lang);
        return this.editMessage(chatId, message.message_id, LabelId.ChangeLang);
      })
      .catch((err) =>
        logger.error(
          `Unable to set thw language for chatId=${chatId} lang=${lang}`,
          err
        )
      );
  }
}
