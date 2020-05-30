import { Logger } from "../logger";
import TelegramBot from "node-telegram-bot-api";
import { VoiceConverter } from "../recognition/types";
import { StatisticApi } from "../statistic";

const logger = new Logger("telegram-bot");

export class TelegramBotModel {
  #stat: StatisticApi;
  #bot: TelegramBot;
  #converter: VoiceConverter;
  #token = "";
  #host = "";
  #path = "";

  constructor(apiToken: string, converter: VoiceConverter, stat: StatisticApi) {
    this.#stat = stat;
    this.#converter = converter;
    this.#token = apiToken;
    this.#bot = new TelegramBot(this.#token);
    this.#bot.on("message", (msg) => this.handleMessage(msg));
  }

  public setHostLocation(host: string, path: string): Promise<void> {
    this.#host = host;
    this.#path = path;

    return this.#bot.setWebHook(`${this.#host}${this.getPath()}`);
  }

  public getPath(): string {
    return `${this.#path}/${this.#token}`;
  }

  public handleApiMessage(message: TelegramBot.Update): void {
    this.#bot.processUpdate(message);
  }

  private handleMessage(msg: TelegramBot.Message): void {
    const chatId = msg.chat.id;

    if (this.isHelloMessage(msg)) {
      this.sendHelloMessage(chatId);
      return;
    }

    if (!this.isVoiceMessage(msg)) {
      this.sendMessage(chatId, "Content is not supported 🌚");
      return;
    }

    const fileName = (msg.voice && (msg.voice as any).file_unique_id) || "";

    this.#stat
      .updateUsageCount(chatId)
      .catch((err) => logger.error("Unable to update stat count", err));

    this.getFileLInk(msg)
      .then((fileLink) => {
        logger.info("New link", fileLink);
        this.sendMessage(chatId, "🎙 Processing voice message");

        return this.#converter.transformToText(fileLink, fileName);
      })
      .then((text: string) => this.#bot.sendMessage(chatId, `🗣 ${text}`))
      .catch((err: Error) => {
        this.sendMessage(chatId, "Unable to convert 😔");
        logger.error(err);
      });
  }

  private isHelloMessage(msg: TelegramBot.Message): boolean {
    return msg && msg.text === "/start";
  }

  private isVoiceMessage(msg: TelegramBot.Message): boolean {
    return msg && !!msg.voice;
  }

  private sendHelloMessage(chatId: number): void {
    this.sendMessage(
      chatId,
      "Hey here! Send me a voice message and I will show what they are talking about in plain text"
    );
  }

  private sendMessage(chatId: number, message: string): void {
    this.#bot
      .sendMessage(chatId, message)
      .catch((err) => logger.error("Unable to send a message", err));
  }

  private getFileLInk(msg: TelegramBot.Message) {
    const fileId = msg.voice && msg.voice.file_id;

    if (!fileId) {
      return Promise.reject(
        new Error("Unable to find a voice file in the message")
      );
    }

    return this.#bot.getFileLink(fileId);
  }
}
