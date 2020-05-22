const prism = require("prism-media");
const https = require("https");
const { writeOutput } = require("../logger");
const header = require("waveheader");

function getWav(fileLink) {
  writeOutput("Converting into wav 💿");
  return new Promise((resolve, reject) => {
    https.get(fileLink, (response) => {
      // Store original file into hard drive
      // const oggFile = fs.createWriteStream("./audio.ogg");
      // response.pipe(oggFile);

      // Store converted file into buffer
      const wavBuffer = [];
      wavBuffer.push(
        header(0, {
          sampleRate: 48000,
        })
      );

      const wavStream = response
        .pipe(new prism.opus.OggDemuxer())
        .pipe(
          new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 })
        );

      wavStream.on("data", (bufferPart) => wavBuffer.push(bufferPart));
      wavStream.on("error", (err) => reject(err));
      wavStream.on("end", () => {
        // Store converted file into hard drive
        // const wavFile = fs.createWriteStream("./audio.wav");
        // wavFile.write(Buffer.concat(wavBuffer));
        //
        resolve(Buffer.concat(wavBuffer));
      });
    });
  });
}

module.exports = {
  getWav,
};
