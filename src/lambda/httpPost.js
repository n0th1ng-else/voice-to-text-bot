const TelegramBot = require("node-telegram-bot-api");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
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
  const chatId = msg.chat.id;
  // eslint-disable-next-line no-console
  console.log(`${chatId} Received new Telegram message`);

  const triggerEvent = (topic, data) => {
    const buf = Buffer.from(JSON.stringify(data), "utf8");
    const topicHandler = pubsub.topic(topic);
    return topicHandler.publish(buf);
  };

  const getTelegramToken = () => {
    return new SecretManagerServiceClient()
      .accessSecretVersion({
        name: process.env.TELEGRAM_TOKEN_SECRET_FIELD,
      })
      .then(([data]) => data.payload.data.toString("utf8"));
  };

  if (!msg.voice) {
    // eslint-disable-next-line no-console
    console.log(`${chatId} Message is not a voice`);

    const messageObject = {
      chatId,
      message: "Content is not supported 🌚",
    };

    return triggerEvent(TOPIC.SEND_MESSAGE, messageObject);
  }

  // eslint-disable-next-line no-console
  console.log(`${chatId} Message includes voice. Processing`);
  const fileId = msg.voice.file_id;

  const messageObject = {
    chatId,
    message: "Processing voice message 🎙",
  };

  return triggerEvent(TOPIC.SEND_MESSAGE, messageObject)
    .then(() => getTelegramToken())
    .then((token) => new TelegramBot(token).getFileLink(fileId))
    .then((fileUrl) => {
      const messageObject = {
        chatId,
        fileUrl,
      };

      return triggerEvent(TOPIC.START_CONVERT, messageObject);
    });
};
