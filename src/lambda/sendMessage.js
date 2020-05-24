const TelegramBot = require("node-telegram-bot-api");

/**
 * TRIGGERS BY "projects/voice-to-message-1590158829666/topics/SEND_MESSAGE"
 *
 * @param pubSubEvent.data.chatId
 * @param pubSubEvent.data.message
 *
 */
exports.sendTelegramMessage = (pubSubEvent) => {
  const data = JSON.parse(Buffer.from(pubSubEvent.data, "base64").toString());
  console.log(`${data.chatId} New message to send ${data.message}`);

  const token = process.env.TELEGRAM_API_TOKEN;
  const bot = new TelegramBot(token);
  return bot.sendMessage(data.chatId, data.message);
};
