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
 * @param pubSubEvent.data.sampleRateHertz
 * @param pubSubEvent.data.audioChannelCount
 *
 */
exports.encodeBufferToText = (pubSubEvent) => {
  const data = JSON.parse(Buffer.from(pubSubEvent.data, "base64").toString());
  console.log(`${data.chatId} Received a Buffer`);

  console.log("chatId", data.chatId);
  console.log("sampleRateHertz", data.sampleRateHertz);
  console.log("audioChannelCount", data.audioChannelCount);

  const triggerEvent = (topic, data) => {
    const buf = Buffer.from(JSON.stringify(data), "utf8");
    const topicHandler = pubsub.topic(topic);
    return topicHandler.publish(buf);
  };

  const client = new speech.SpeechClient();

  const params = {
    audio: {
      content: data.fileBuffer,
    },
    config: {
      encoding: "OGG_OPUS",
      sampleRateHertz: data.sampleRateHertz,
      audioChannelCount: data.numberOfChannels,
      model: "phone_call",
      useEnhanced: true,
      // TODO detect lang
      languageCode: "ru-RU",
      // alternativeLanguageCodes: ["en-GB", "en-US""],
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
