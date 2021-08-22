import generateHeader from "waveheader";
import { FFmpeg } from "prism-media";
import { get as runGet } from "https";
import { writeFile } from "fs";
import { Logger } from "../logger";
import { isDebug } from "../env";
import { wavSampleRate as sampleRate } from "../const";

const logger = new Logger("ogg-to-wav");

const getWavBuffer = (fileLink: string): Promise<Buffer> => {
  logger.info("Converting into wav 💿");

  return new Promise<Buffer>((resolve, reject) => {
    runGet(fileLink, (response) => {
      const wavBuffer: Buffer[] = [];
      const wavStream = response.pipe(getMpegDecoder());

      // WAV header here we go
      wavBuffer.push(
        generateHeader(0, {
          sampleRate,
        })
      );

      wavStream.on("data", (bufferPart) => wavBuffer.push(bufferPart));
      wavStream.on("error", (err) => reject(err));
      wavStream.on("end", () => resolve(Buffer.concat(wavBuffer)));
    }).on("error", (err) => reject(err));
  });
};

const getMpegDecoder = (): FFmpeg =>
  new FFmpeg({
    args: [
      "-analyzeduration",
      "0",
      "-loglevel",
      "0",
      "-f",
      "s16le",
      "-ar",
      String(sampleRate),
      "-ac",
      "1",
    ],
  });

const saveBufferToFile = (buff: Buffer, fileName = "output.wav"): void => {
  logger.info("Saving the wav file buffer into filesystem");
  writeFile(fileName, buff, (err) => {
    if (err) {
      return logger.error("Unable to dump the file", err);
    }
    logger.info("Dump complete");
  });
};

export const getWav = (fileLink: string): Promise<Buffer> => {
  return getWavBuffer(fileLink).then((buff) => {
    if (isDebug) {
      saveBufferToFile(buff);
    }

    return buff;
  });
};
