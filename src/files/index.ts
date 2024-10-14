import { promises, createWriteStream } from "node:fs";
import type { IncomingMessage } from "node:http";
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

export const deleteFileIfExists = async (
  fileName: string,
  err?: unknown,
): Promise<string> => {
  logger.info(`Deleting ${Logger.g(fileName)} from the filesystem`);

  const isExist = await isFileExist(fileName);
  if (isExist) {
    logger.info(`${fileName} found on the filesystem. Trying to delete...`);
    await deleteFile(fileName);
  } else {
    logger.info(`${fileName} does not exists`);
  }

  if (err) {
    logger.error(`${fileName} comes with an error`, err);
    return Promise.reject(err);
  }

  return fileName;
};

const getFullFileName = (
  dir: string,
  fileName = generateFileName(),
): string => {
  return resolve([".", dir, fileName].filter(Boolean).join("/"));
};

export const saveStreamToFile = async (
  stream: IncomingMessage,
  dir: string,
  fileName?: string,
): Promise<string> => {
  const name = getFullFileName(dir, fileName);
  logger.info(`Saving the stream into filesystem. The file name is ${name}`);

  return new Promise<string>((resolve, reject) => {
    const fileStream = createWriteStream(name);

    fileStream
      .on("error", (err: Error) => {
        logger.error("Unable to dump the file", err);
        reject(err);
      })
      .on("finish", () => {
        logger.info("Dump complete");
        resolve(name);
      });

    stream.pipe(fileStream);
  }).catch((err) => deleteFileIfExists(name, err));
};

export const readFileIntoBuffer = async (fileName: string): Promise<Buffer> => {
  const buffer = await promises.readFile(fileName);
  return buffer;
};

export const readDirectoryFiles = async (dir: URL): Promise<string[]> => {
  const files = await promises.readdir(dir);
  const folder = fileURLToPath(dir);
  return files.map((file) => resolve(folder, file));
};
