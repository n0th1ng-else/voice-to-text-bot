import generateHeader from "waveheader";
import { opus } from "prism-media";
import { get as runGet } from "https";
import { createWriteStream } from "fs";
import { Logger } from "../logger";

const logger = new Logger("ogg-to-wav");

export function getWav(fileLink: string) {
  logger.info("Converting into wav 💿");

  return new Promise((resolve, reject) => {
    runGet(fileLink, (response) => {
      // Store original file into hard drive
      const oggFile = createWriteStream("./audio.ogg");
      response.pipe(oggFile);

      // Store converted file into buffer
      const wavBuffer: Buffer[] = [];
      wavBuffer.push(
        generateHeader(0, {
          sampleRate: 48000,
        })
      );

      const wavStream = response
        .pipe(new opus.OggDemuxer())
        .pipe(new opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 }));

      wavStream.on("data", (bufferPart) => wavBuffer.push(bufferPart));
      wavStream.on("error", (err) => reject(err));
      wavStream.on("end", () => {
        // Store converted file into hard drive
        const wavFile = createWriteStream("./audio.wav");
        wavFile.write(Buffer.concat(wavBuffer));
        //
        resolve(Buffer.concat(wavBuffer));
      });
    });
  });
}
