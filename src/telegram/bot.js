const TelegramBot = require("node-telegram-bot-api");
const { writeOutput, writeError } = require("../logger");

class TelegramBotModel {
  #bot = null;
  #converter = null;
  #token = "";
  #host = "";
  #path = "";

  constructor(apiToken, converter) {
    this.#converter = converter;
    this.#token = apiToken;
    this.#bot = new TelegramBot(this.#token);
    this.#bot.on("message", (msg) => this._handleMessage(msg));
  }

  setHostLocation(host, path) {
    this.#host = host;
    this.#path = path;

    return this.#bot.setWebHook(`${this.#host}${this.getPath()}`);
  }

  getPath() {
    return `${this.#path}/${this.#token}`;
  }

  handleApiMessage(req) {
    this.#bot.processUpdate(req.body);
  }

  _handleMessage(msg) {
    const chatId = msg.chat.id;

    if (!msg.voice) {
      this.#bot.sendMessage(chatId, "Content is not supported 🌚");
      return;
    }

    const voiceData = msg.voice;
    const fileId = msg.voice.file_id;

    this.#bot
      .getFileLink(fileId)
      .then((fileLink) => {
        writeOutput("New link", fileLink);
        this.#bot.sendMessage(chatId, "Processing voice message 🎙");
        return this.#converter.transformToText(fileLink, voiceData);
      })
      .then((text) => this.#bot.sendMessage(chatId, `🗣 ${text}`))
      .catch((err) => {
        this.#bot.sendMessage(chatId, "Unable to convert 😔");
        writeError(err);
      });
  }
}

module.exports = {
  TelegramBotModel,
};
