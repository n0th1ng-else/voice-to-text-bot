const { PubSub } = require("@google-cloud/pubsub");

const pubsub = new PubSub();
const TOPIC = {
  SEND_MESSAGE: "projects/voice-to-message-1590158829666/topics/SEND_MESSAGE",
};
/**
 * TRIGGERS BY "projects/voice-to-message-1590158829666/topics/GET_TEXT_RESULT"
 *
 * @param pubSubEvent.data.chatId
 * @param pubSubEvent.data.textData
 *
 */
exports.extractTextLiteral = (pubSubEvent) => {
  const data = JSON.parse(Buffer.from(pubSubEvent.data, "base64").toString());
  // eslint-disable-next-line no-console
  console.log(`${data.chatId} Received a text data`);

  // eslint-disable-next-line no-console
  console.log("chatId", data.chatId);
  // eslint-disable-next-line no-console
  console.log("textData", data.textData);

  const triggerEvent = (topic, data) => {
    const buf = Buffer.from(JSON.stringify(data), "utf8");
    const topicHandler = pubsub.topic(topic);
    return topicHandler.publish(buf);
  };

  const transcription = data.textData[0].results
    .map((result) => result.alternatives[0].transcript)
    .join("\n");

  // eslint-disable-next-line no-console
  console.log(`${data.chatId} Complete`);

  const messageObject = {
    chatId: data.chatId,
    message: `🗣 ${transcription}`,
  };

  return triggerEvent(TOPIC.SEND_MESSAGE, messageObject);
};
