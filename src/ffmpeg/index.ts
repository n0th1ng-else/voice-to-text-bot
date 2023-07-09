import type { IncomingMessage } from "node:http";
import axios from "axios";
import prism from "prism-media";
import { Logger } from "../logger/index.js";
import { isDebug } from "../env.js";
import { wavSampleRate } from "../const.js";
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
    String(wavSampleRate),
    "-ac",
    "1",
  ];
};

const getMpegDecoderStream = (fileName?: string): prism.FFmpeg =>
  new FFmpeg({
    args: getMpegDecoderArgs(fileName),
  });

const readWavBuffer = (wavStream: prism.FFmpeg): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const wavBuffer: Buffer[] = [];
    wavStream.on("data", (bufferPart) => wavBuffer.push(bufferPart));
    wavStream.on("error", (err) => reject(err));
    wavStream.on("end", () => resolve(Buffer.concat(wavBuffer)));
  });
};

const readWavBufferFromFileAndDelete = (
  fileLink: string,
  fileName: string,
): Promise<Buffer> => {
  if (isDebug) {
    logger.info(`The link is ${fileLink}`);
    logger.info(`The file is ${fileName}`);
  }
  const wavStream = getMpegDecoderStream(fileName);
  return readWavBuffer(wavStream)
    .then((buff) =>
      Promise.all([Promise.resolve(buff), deleteFileIfExists(fileName)]),
    )
    .then(([buff]) => buff)
    .catch((err) => deleteFileIfExists(fileName, err))
    .then((buff) => {
      if (typeof buff === "string") {
        return Promise.reject(
          new Error("wrong file output! expected Buffer received string"),
        );
      }

      return buff;
    });
};

const readWavBufferFromStream = (stream: IncomingMessage): Promise<Buffer> => {
  const wavStream = stream.pipe(getMpegDecoderStream());
  return readWavBuffer(wavStream);
};

const getWavBufferFromAudio = (fileLink: string): Promise<Buffer> => {
  logger.info("Converting 🎶 AUDIO into wav 💿");

  return downloadAsStream(fileLink)
    .then((stream) => readWavBufferFromStream(stream))
    .then((buff) => {
      if (isDebug) {
        logger.info(`The link is ${fileLink}`);
        return saveBufferToFile(buff, "", "output.wav").then((fileName) => {
          logger.info(`The file is ${fileName}`);
          return buff;
        });
      }

      return buff;
    });
};

const getWavBufferFromVideo = (fileLink: string): Promise<Buffer> => {
  logger.info("Converting 🎥 VIDEO into wav 💿");

  return downloadAsStream(fileLink)
    .then((stream) => saveStreamToFile(stream, "video-temp"))
    .then((fileName) => readWavBufferFromFileAndDelete(fileLink, fileName));
};

export const getWav = (fileLink: string, isVideo: boolean): Promise<Buffer> =>
  isVideo ? getWavBufferFromVideo(fileLink) : getWavBufferFromAudio(fileLink);
