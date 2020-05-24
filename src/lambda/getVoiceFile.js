const https = require("https");
const mm = require("music-metadata");
const { PubSub } = require("@google-cloud/pubsub");

const pubsub = new PubSub();

const TOPIC = {
  GET_TEXT: "projects/voice-to-message-1590158829666/topics/GET_TEXT",
  SEND_MESSAGE: "projects/voice-to-message-1590158829666/topics/SEND_MESSAGE",
};

/**
 * TRIGGERS BY "projects/voice-to-message-1590158829666/topics/START_CONVERT"
 *
 * @param pubSubEvent.data.chatId
 * @param pubSubEvent.data.fileUrl
 *
 */
exports.getVoiceFileBuffer = (pubSubEvent) => {
  const data = JSON.parse(Buffer.from(pubSubEvent.data, "base64").toString());
  console.log(`${data.chatId} Received a file`);

  console.log("chatId", data.chatId);
  console.log("fileUrl", data.fileUrl);

  const triggerEvent = (topic, data) => {
    const buf = Buffer.from(JSON.stringify(data), "utf8");
    const topicHandler = pubsub.topic(topic);
    return topicHandler.publish(buf);
  };

  return new Promise((resolve, reject) => {
    https.get(data.fileUrl, (response) => {
      const oggBuffer = [];
      response.on("data", (chunk) => oggBuffer.push(chunk));
      response.on("error", (err) => reject(err));
      response.on("end", () => resolve(Buffer.concat(oggBuffer)));
    });
  })
    .then((binaryBuffer) => {
      return mm.parseBuffer(binaryBuffer).then((info) => ({
        sampleRate: info.format.sampleRate,
        numberOfChannels: info.format.numberOfChannels,
        bufferString: binaryBuffer.toString("base64"),
      }));
    })
    .then((bufferData) => {
      console.log(`${data.chatId} Created a buffer. Encoding...`);
      const messageObject = {
        ...data,
        fileBuffer: bufferData.bufferString,
        sampleRateHertz: bufferData.sampleRate,
        audioChannelCount: bufferData.numberOfChannels,
      };

      return triggerEvent(TOPIC.GET_TEXT, messageObject);
    })
    .catch((err) => {
      console.log(`${data.chatId} Unable to get buffer`, err);

      const messageObject = {
        chatId: data.chatId,
        message: "Failed to get message text 🌚",
      };

      return triggerEvent(TOPIC.SEND_MESSAGE, messageObject);
    });
};
