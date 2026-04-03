import { Readable } from "node:stream";
import ffmpegBinPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { Logger } from "../logger/index.js";
import { deleteFileIfExists, readFileIntoBuffer, saveStreamToFile } from "../files/index.js";
import { API_TIMEOUT_MS, wavSampleRate } from "../const.js";

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
    .on("error", async (error: Error) => {
      await deleteFileIfExists(outputFile);
      reject(error);
    });

  return promise;
};

const downloadAsStream = async (url: string): Promise<Readable> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error("Response body is empty");
  }
  return Readable.fromWeb(response.body);
};

const getWavFilePathFromLocal = async (fsFilePath: string): Promise<string> => {
  try {
    logger.debug("Converting 🎶 Voice into wav 💿");
    const file = await convertFileToWav(fsFilePath);
    logger.info(`WAV 🎶 file location: ${Logger.g(file)}`);
    await deleteFileIfExists(fsFilePath);
    return file;
  } catch (err) {
    await deleteFileIfExists(fsFilePath);
    throw err;
  }
};

const getRawFilePath = async (fileLink: string, isLocalFile: boolean): Promise<string> => {
  if (isLocalFile) {
    return fileLink;
  }
  logger.debug("Saving voice file to the filesystem...");
  const originalFileName = fileLink.split("/").at(-1) ?? "file.ogg";
  const stream = await downloadAsStream(fileLink);
  const pathToFile = await saveStreamToFile(stream, originalFileName, true);
  logger.info(`Telegram file location: ${Logger.g(pathToFile)}`);
  return pathToFile;
};

export const getWavFilePath = async (fileLink: string, isLocalFile: boolean): Promise<string> => {
  const pathToFile = await getRawFilePath(fileLink, isLocalFile);
  return await getWavFilePathFromLocal(pathToFile);
};

export const getAudioFilePath = async (
  fileLink: string,
  isLocalFile: boolean,
  shouldConvertToWav = true,
): Promise<string> => {
  return shouldConvertToWav
    ? await getWavFilePath(fileLink, isLocalFile)
    : await getRawFilePath(fileLink, isLocalFile);
};

export const getAudioBuffer = async (
  fileLink: string,
  isLocalFile: boolean,
  shouldConvertToWav = true,
): Promise<Buffer<ArrayBufferLike>> => {
  const filename = await getAudioFilePath(fileLink, isLocalFile, shouldConvertToWav);
  const buffer = await readFileIntoBuffer(filename);
  await deleteFileIfExists(filename);
  return buffer;
};
