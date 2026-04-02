import { promises, createWriteStream } from "node:fs";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { nanoid } from "nanoid";
import { Logger } from "../logger/index.js";

const logger = new Logger("media-to-wav");

const generateFileName = (): string => `${nanoid()}.tmp`;

/**
 * [!] Safe, never throws
 * @param fileName  file path to be checked
 */
export const isFileExist = async (fileName: string | URL): Promise<boolean> =>
  promises.access(fileName).then(
    () => true,
    () => false,
  );

export const readFile = async (fileName: string | URL): Promise<Buffer> =>
  promises.readFile(fileName);

/**
 * [!] Safe, never throws
 * @param fileName  file path to be deleted
 */
const deleteFile = async (fileName: string): Promise<void> => {
  return promises
    .unlink(fileName)
    .then(() => {
      logger.info(`${fileName} was deleted from the filesystem`);
    })
    .catch((err) => {
      logger.error(`${fileName} caused errors during the delete attempt`, err);
    });
};

export const deleteFileIfExists = async (fileName: string): Promise<string> => {
  logger.info(`Deleting ${Logger.g(fileName)} from the filesystem`);

  const isExist = await isFileExist(fileName);
  if (isExist) {
    logger.info(`${fileName} found on the filesystem. Trying to delete...`);
    await deleteFile(fileName);
  } else {
    logger.info(`${fileName} does not exists`);
  }

  return fileName;
};

export const getFullFileName = (
  fileName = generateFileName(),
  addUniqPrefix = false,
  dir = "file-temp",
): string => {
  const name = addUniqPrefix ? `${nanoid(10)}_${fileName}` : fileName;
  return resolve([".", dir, name].filter(Boolean).join("/"));
};

export const saveStreamToFile = async (
  stream: Readable,
  fileName?: string,
  addUniqPrefix?: boolean,
  dir?: string,
): Promise<string> => {
  const name = getFullFileName(fileName, addUniqPrefix, dir);
  logger.info(`Saving the stream into filesystem. The file name is ${name}`);
  const fileStream = createWriteStream(name);

  try {
    await pipeline(stream, fileStream);
    logger.info("File download completed");
    return name;
  } catch (err) {
    logger.error("Unable to download the file", err);
    await deleteFileIfExists(name);
    throw err;
  }
};

export const readFileIntoBuffer = async (fileName: string): Promise<Buffer<ArrayBufferLike>> => {
  const buffer = await promises.readFile(fileName);
  return buffer;
};

export const readDirectoryFiles = async (dir: URL): Promise<string[]> => {
  const files = await promises.readdir(dir);
  const folder = fileURLToPath(dir);
  return files.map((file) => resolve(folder, file));
};
