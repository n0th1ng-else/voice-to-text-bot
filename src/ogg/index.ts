import generateHeader from "waveheader";
import { opus } from "prism-media";
import { get as runGet } from "https";
import { Logger } from "../logger";

const logger = new Logger("ogg-to-wav");

export function getWav(fileLink: string): Promise<Buffer> {
  logger.info("Converting into wav 💿");

  return new Promise<Buffer>((resolve, reject) => {
    runGet(fileLink, (response) => {
      const wavBuffer: Buffer[] = [];

      // OggDemuxer converts into raw PCM data so we need to have a WAV header
      const wavStream = response
        .pipe(new opus.OggDemuxer())
        .pipe(new opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 }));

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
