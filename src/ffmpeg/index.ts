import type { Readable } from "node:stream";
import ffmpegBinPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import axios from "axios";
import { Logger } from "../logger/index.js";
import { deleteFileIfExists, readFileIntoBuffer, saveStreamToFile } from "../files/index.js";
import { wavSampleRate } from "../const.js";

const logger = new Logger("media-to-wav");

/**
 * See more info:
 * - https://creatomate.com/blog/how-to-use-ffmpeg-in-nodejs
 * - https://www.npmjs.com/package/fluent-ffmpeg
 */
const convertFileToWav = async (inputFile: string): Promise<string> => {
  const outputFile = `${inputFile}.wav`;
  const { promise, resolve, reject } = Promise.withResolvers<string>();

  if (typeof ffmpegBinPath !== "string") {
    throw new TypeError("Ffmpeg binary was not found!");
  }

  ffmpeg.setFfmpegPath(ffmpegBinPath);

  ffmpeg()
    .setFfmpegPath(ffmpegBinPath)
    .input(inputFile)
    .outputOptions(["-analyzeduration 0", "-loglevel 0", `-ar ${wavSampleRate}`, "-ac 1"])
    .saveToFile(outputFile)
    .on("end", () => {
      resolve(outputFile);
    })
    .on("error", (error: Error) => {
      reject(error);
    });

  return promise;
};

const downloadAsStream = (url: string): Promise<Readable> =>
  axios
    .request<Readable>({
      method: "GET",
      url,
      responseType: "stream",
    })
    .then(({ data: stream }) => stream);

const getWavFilePathFromLocal = async (fsFilePath: string): Promise<string> => {
  try {
    const file = await convertFileToWav(fsFilePath);
    logger.info(`WAV 🎶 file location: ${Logger.g(file)}`);
    await deleteFileIfExists(fsFilePath);
    return file;
  } catch (err) {
    await deleteFileIfExists(fsFilePath);
    throw err;
  }
};

export const getWavFilePath = async (fileLink: string, isLocalFile: boolean): Promise<string> => {
  if (isLocalFile) {
    return await getWavFilePathFromLocal(fileLink);
  }
  logger.debug("Converting 🎶 Voice into wav 💿");
  const originalFileName = fileLink.split("/").at(-1) ?? "file.ogg";
  const stream = await downloadAsStream(fileLink);
  const pathToFile = await saveStreamToFile(stream, originalFileName, true);
  logger.info(`Telegram file location: ${Logger.g(pathToFile)}`);
  return await getWavFilePathFromLocal(pathToFile);
};

export const getWavBuffer = async (
  fileLink: string,
  isLocalFile: boolean,
): Promise<Buffer<ArrayBufferLike>> => {
  const filename = await getWavFilePath(fileLink, isLocalFile);
  const buffer = await readFileIntoBuffer(filename);
  await deleteFileIfExists(filename);
  return buffer;
};
