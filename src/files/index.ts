import { promises, createWriteStream } from "node:fs";
import type { IncomingMessage } from "node:http";
import { nanoid } from "nanoid";
import { Logger } from "../logger/index.js";

const logger = new Logger("media-to-wav");

const generateFileName = (): string => `${nanoid()}.tmp`;

/**
 * Safe, never throws
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
 * Safe, never throws
 * @param fileName  file path to be deleted
 */
// Safe, never throws
const deleteFile = (fileName: string): Promise<void> => {
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
  err?: Error,
): Promise<string> => {
  logger.info(
    `Deleting a file from the filesystem. The file name is ${fileName}`,
  );

  return isFileExist(fileName)
    .then((isExist) => {
      if (isExist) {
        logger.info(`${fileName} found on the filesystem. Trying to delete...`);
        return deleteFile(fileName);
      }
      logger.info(`${fileName} does not exists`);
    })
    .then(() => {
      if (err) {
        logger.error(`${fileName} comes with an error`, err);
        return Promise.reject(err);
      }
      return fileName;
    });
};

export const saveBufferToFile = async (
  buff: Buffer,
  dir: string,
  fileName?: string,
): Promise<string> => {
  const name = [".", dir, fileName ?? generateFileName()]
    .filter(Boolean)
    .join("/");
  logger.info(`Saving the buffer into filesystem. The file name is ${name}`);

  return promises
    .writeFile(name, buff)
    .then(() => {
      logger.info("Dump complete");
      return name;
    })
    .catch((err) => {
      logger.error("Unable to dump the file", err);
      return deleteFileIfExists(name, err);
    });
};

export const saveStreamToFile = async (
  stream: IncomingMessage,
  dir: string,
  fileName?: string,
): Promise<string> => {
  const name = [".", dir, fileName ?? generateFileName()]
    .filter(Boolean)
    .join("/");
  logger.info(`Saving the stream into filesystem. The file name is ${name}`);

  return new Promise<string>((resolve, reject) => {
    const fileStream = createWriteStream(name);

    fileStream
      .on("error", (err) => {
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
