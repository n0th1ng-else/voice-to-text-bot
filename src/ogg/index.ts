import generateHeader from "waveheader";
import { FFmpeg } from "prism-media";
import { get as runGet } from "https";
import { Logger } from "../logger";

const logger = new Logger("ogg-to-wav");

export function getWav(fileLink: string): Promise<Buffer> {
  logger.info("Converting into wav 💿");

  return new Promise<Buffer>((resolve, reject) => {
    runGet(fileLink, (response) => {
      const wavBuffer: Buffer[] = [];
      const wavStream = response.pipe(getMpegDecoder());

      // WAV header here we go
      wavBuffer.push(
        generateHeader(0, {
          sampleRate: 48000,
        })
      );

      wavStream.on("data", (bufferPart) => wavBuffer.push(bufferPart));
      wavStream.on("error", (err) => reject(err));
      wavStream.on("end", () => resolve(Buffer.concat(wavBuffer)));
    }).on("error", (err) => reject(err));
  });
}

function getMpegDecoder(): FFmpeg {
  return new FFmpeg({
    args: [
      "-analyzeduration",
      "0",
      "-loglevel",
      "0",
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "1",
    ],
  });
}
