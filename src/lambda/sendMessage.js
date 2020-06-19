const TelegramBot = require("node-telegram-bot-api");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

/**
 * TRIGGERS BY "projects/voice-to-message-1590158829666/topics/SEND_MESSAGE"
 *
 * @param pubSubEvent.data.chatId
 * @param pubSubEvent.data.message
 *
 */
exports.sendTelegramMessage = (pubSubEvent) => {
  const data = JSON.parse(Buffer.from(pubSubEvent.data, "base64").toString());
  // eslint-disable-next-line no-console
  console.log(`${data.chatId} New message to send ${data.message}`);

  const getTelegramToken = () => {
    return new SecretManagerServiceClient()
      .accessSecretVersion({
        name: process.env.TELEGRAM_TOKEN_SECRET_FIELD,
      })
      .then(([secret]) => secret.payload.data.toString("utf8"));
  };

  return getTelegramToken().then((token) =>
    new TelegramBot(token).sendMessage(data.chatId, data.message)
  );
};
