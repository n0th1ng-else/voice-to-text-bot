const TelegramBot = require("node-telegram-bot-api");
const { PubSub } = require("@google-cloud/pubsub");

const pubsub = new PubSub();

const TOPIC = {
  START_CONVERT: "projects/voice-to-message-1590158829666/topics/START_CONVERT",
  SEND_MESSAGE: "projects/voice-to-message-1590158829666/topics/SEND_MESSAGE",
};

/**
 * TRIGGERS BY HTTP EVENT
 *
 * @param req
 * @param req.body
 * @param req.body.message
 * @param res
 * @returns {Promise<string>}
 */
exports.handleIncomingHTTPMessage = (req, res) => {
  res.sendStatus(200);
  const msg = req.body.message;
  const token = process.env.TELEGRAM_API_TOKEN;
  const bot = new TelegramBot(token);
  const chatId = msg.chat.id;
  console.log(`${chatId} Received new Telegram message`);

  const triggerEvent = (topic, data) => {
    const buf = Buffer.from(JSON.stringify(data), "utf8");
    const topicHandler = pubsub.topic(topic);
    return topicHandler.publish(buf);
  };

  if (!msg.voice) {
    console.log(`${chatId} Message is not a voice`);

    const messageObject = {
      chatId,
      message: "Content is not supported 🌚",
    };

    return triggerEvent(TOPIC.SEND_MESSAGE, messageObject);
  }

  console.log(`${chatId} Message includes voice. Processing`);
  const fileId = msg.voice.file_id;

  const messageObject = {
    chatId,
    message: "Processing voice message 🎙",
  };

  return triggerEvent(TOPIC.SEND_MESSAGE, messageObject)
    .then(() => bot.getFileLink(fileId))
    .then((fileUrl) => {
      const messageObject = {
        chatId,
        fileUrl,
      };

      return triggerEvent(TOPIC.START_CONVERT, messageObject);
    });
};
