const speech = require("@google-cloud/speech");
const { PubSub } = require("@google-cloud/pubsub");

const pubsub = new PubSub();

const TOPIC = {
  GET_TEXT_RESULT:
    "projects/voice-to-message-1590158829666/topics/GET_TEXT_RESULT",
  SEND_MESSAGE: "projects/voice-to-message-1590158829666/topics/SEND_MESSAGE",
};

/**
 * TRIGGERS BY "projects/voice-to-message-1590158829666/topics/GET_TEXT"
 *
 * @param pubSubEvent.data.chatId
 * @param pubSubEvent.data.fileBuffer
 *
 */
exports.encodeBufferToText = (pubSubEvent) => {
  const data = JSON.parse(Buffer.from(pubSubEvent.data, "base64").toString());
  console.log(`${data.chatId} Received a Buffer`);

  console.log("chatId", data.chatId);
  console.log("fileBuffer", data.fileBuffer);

  const triggerEvent = (topic, data) => {
    const buf = Buffer.from(JSON.stringify(data), "utf8");
    const topicHandler = pubsub.topic(topic);
    return topicHandler.publish(buf);
  };

  const client = new speech.SpeechClient({
    projectId: process.env.GOOGLE_PROJECT_ID,
    credentials: {
      private_key: process.env.GOOGLE_PRIVATE_KEY,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
  });

  const params = {
    audio: {
      content: data.fileBuffer,
    },
    config: {
      encoding: "OGG_OPUS",
      sampleRateHertz: 16000,
      languageCode: "ru-RU",
    },
  };

  return client
    .recognize(params)
    .then((textData) => {
      console.log(`${data.chatId} Created a text. Extracting literal...`);
      const messageObject = {
        ...data,
        textData,
      };

      return triggerEvent(TOPIC.GET_TEXT_RESULT, messageObject);
    })
    .catch((err) => {
      console.log(`${data.chatId} Unable to convert into text`, err);

      const messageObject = {
        chatId: data.chatId,
        message: "Failed to convert message into text 🌚",
      };

      return triggerEvent(TOPIC.SEND_MESSAGE, messageObject);
    });
};
