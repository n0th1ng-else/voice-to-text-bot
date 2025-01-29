import type { IncomingMessage } from "node:http";
import ffmpegBinPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import axios from "axios";
import { nanoid } from "nanoid";
import { Logger } from "../logger/index.ts";
import {
  deleteFileIfExists,
  readFileIntoBuffer,
  saveStreamToFile,
} from "../files/index.ts";
import { wavSampleRate } from "../const.ts";

const logger = new Logger("media-to-wav");

/**
 * See more info:
 * - https://creatomate.com/blog/how-to-use-ffmpeg-in-nodejs
 * - https://www.npmjs.com/package/fluent-ffmpeg
 */
const convertFileToWav = async (inputFile: string): Promise<string> => {
  const outputFile = `${inputFile}.wav`;
  return new Promise((resolve, reject) => {
    if (typeof ffmpegBinPath !== "string") {
      return Promise.reject(new Error("Ffmpeg binary was now found!"));
    }

    ffmpeg.setFfmpegPath(ffmpegBinPath);

    ffmpeg()
      .setFfmpegPath(ffmpegBinPath)
      .input(inputFile)
      .outputOptions([
        "-analyzeduration 0",
        "-loglevel 0",
        `-ar ${wavSampleRate}`,
        "-ac 1",
      ])
      .saveToFile(outputFile)
      .on("end", () => {
        resolve(outputFile);
      })
      .on("error", (error: Error) => {
        reject(error);
      });
  });
};

const downloadAsStream = (url: string): Promise<IncomingMessage> =>
  axios
    .request<IncomingMessage>({
      method: "GET",
      url,
      responseType: "stream",
    })
    .then(({ data: stream }) => stream);

export const getWavFilePath = async (fileLink: string): Promise<string> => {
  logger.debug("Converting 🎶 Voice into wav 💿");
  const originalFileName = fileLink.split("/").at(-1) ?? "file.ogg";
  const inputFile = `${nanoid(10)}_${originalFileName}`;
  const stream = await downloadAsStream(fileLink);
  const pathToFile = await saveStreamToFile(stream, "file-temp", inputFile);
  logger.info(`Telegram file location: ${Logger.g(pathToFile)}`);

  try {
    const file = await convertFileToWav(pathToFile);
    logger.info(`WAV 🎶 file location: ${Logger.g(file)}`);
    await deleteFileIfExists(pathToFile);
    return file;
  } catch (err) {
    await deleteFileIfExists(pathToFile, err);
    throw new Error(
      "Never thrown: deleteFileIfExists throws the original error",
    );
  }
};

export const getWavBuffer = async (fileLink: string): Promise<Buffer> => {
  const filename = await getWavFilePath(fileLink);
  const buffer = await readFileIntoBuffer(filename);
  await deleteFileIfExists(filename);
  return buffer;
};
