const https = require("https");
const speech = require("@google-cloud/speech");
const { writeOutput } = require("../logger");

class GoogleProvider {
  constructor(environmentVars) {
    writeOutput("Using Google");

    this.service = new speech.SpeechClient({
      projectId: environmentVars.GOOGLE_PROJECT_ID,
      credentials: {
        private_key: environmentVars.GOOGLE_PRIVATE_KEY,
        client_email: environmentVars.GOOGLE_CLIENT_EMAIL,
      },
    });

    this.config = {
      encoding: "OGG_OPUS",
      sampleRateHertz: 16000,
      languageCode: "ru-RU",
    };
  }

  transformToText(fileLink, data) {
    const name = `${data.file_unique_id}.wav`;
    writeOutput("Starting process for", fileLink);
    return this.getFileBase64(fileLink)
      .then((base64data) => {
        const params = {
          audio: {
            content: base64data,
          },
          config: this.config,
        };

        writeOutput("Start converting", name, fileLink);
        return this.service.recognize(params);
      })
      .then((translationData) => this.unpackTranscription(translationData))
      .then((text) => {
        writeOutput(`Job ${name} completed`);
        return text;
      });
  }

  unpackTranscription(translationData) {
    const transcription = translationData[0].results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");
    return Promise.resolve(transcription);
  }

  getFileBase64(fileLink) {
    writeOutput("Converting into base64 💿");
    return new Promise((resolve, reject) => {
      https.get(fileLink, (response) => {
        const oggBuffer = [];
        response.on("data", (chunk) => oggBuffer.push(chunk));
        response.on("error", (err) => reject(err));
        response.on("end", () =>
          resolve(Buffer.concat(oggBuffer).toString("base64"))
        );
      });
    });
  }
}

module.exports = {
  GoogleProvider,
};
