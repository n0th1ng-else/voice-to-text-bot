import type { IncomingMessage } from "node:http";
import axios from "axios";
import prism from "prism-media";
import { Logger } from "../logger/index.js";
import { isDebug } from "../env.js";
import { wavSampleRate as sampleRate } from "../const.js";
import {
  deleteFileIfExists,
  saveBufferToFile,
  saveStreamToFile,
} from "../files/index.js";

const { FFmpeg } = prism;

const logger = new Logger("media-to-wav");

const downloadAsStream = (url: string): Promise<IncomingMessage> =>
  axios
    .request<IncomingMessage>({
      method: "GET",
      url,
      responseType: "stream",
    })
    .then(({ data: stream }) => stream);

const getWavBufferFromAudio = (fileLink: string): Promise<Buffer> => {
  logger.info("Converting 🎶 AUDIO into wav 💿");

  return downloadAsStream(fileLink).then((stream) =>
    new Promise<Buffer>((resolve, reject) => {
      const wavBuffer: Buffer[] = [];
      const wavStream = stream.pipe(getMpegDecoderStream());
      wavStream.on("data", (bufferPart) => wavBuffer.push(bufferPart));
      wavStream.on("error", (err) => reject(err));
      wavStream.on("end", () => resolve(Buffer.concat(wavBuffer)));
    }).then((buff) => {
      if (isDebug) {
        logger.info(`The link is ${fileLink}`);
        saveBufferToFile(buff, "", "output.wav").then((fileName) =>
          logger.info(`The file is ${fileName}`)
        );
      }

      return buff;
    })
  );
};

const getWavBufferFromVideo = (fileLink: string): Promise<Buffer> => {
  logger.info("Converting 🎥 VIDEO into wav 💿");

  return downloadAsStream(fileLink)
    .then((stream) => saveStreamToFile(stream, "video-temp"))
    .then((fileName) =>
      new Promise<Buffer>((resolve, reject) => {
        const wavBuffer: Buffer[] = [];
        const wavStream = getMpegDecoderStream(fileName);
        wavStream.on("data", (bufferPart) => wavBuffer.push(bufferPart));
        wavStream.on("error", (err) => reject(err));
        wavStream.on("end", () => resolve(Buffer.concat(wavBuffer)));
      }).finally(() => {
        if (isDebug) {
          logger.info(`The link is ${fileLink}`);
          logger.info(`The file is ${fileName}`);
          return;
        }
        return deleteFileIfExists(fileName);
      })
    );
};

const getMpegDecoderArgs = (fileName?: string): string[] => {
  const input = fileName ? ["-i", fileName] : [];
  return [
    ...input,
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
  ];
};

const getMpegDecoderStream = (fileName?: string): prism.FFmpeg =>
  new FFmpeg({
    args: getMpegDecoderArgs(fileName),
  });

export const getWav = (fileLink: string, isVideo: boolean): Promise<Buffer> =>
  isVideo ? getWavBufferFromVideo(fileLink) : getWavBufferFromAudio(fileLink);
