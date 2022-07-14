import { promises, createWriteStream } from "fs";
import { IncomingMessage } from "http";
import { nanoid } from "nanoid";
import { Logger } from "../logger";

const logger = new Logger("media-to-wav");

const generateFileName = (): string => `${nanoid()}.tmp`;

const isFileExist = (fileName: string): Promise<boolean> =>
  promises.access(fileName).then(
    () => true,
    () => false
  );

export const deleteFileIfExists = (
  fileName: string,
  shouldThrowError = false,
  err?: Error
): Promise<string> => {
  logger.info(
    `Deleting a file from the filesystem. The file name is ${fileName}`
  );

  return isFileExist(fileName)
    .then((isExist) => {
      if (isExist) {
        logger.info(`${fileName} found on the filesystem. Trying to delete...`);
        return promises.unlink(fileName);
      }
      logger.info(`${fileName} does not exists`);
    })
    .then(() => {
      logger.info(`${fileName} was deleted from the filesystem`);
      if (err) {
        logger.error(`${fileName} comes with an error`, err);
        return Promise.reject(err);
      }
      return fileName;
    })
    .catch((err) => {
      logger.error(`${fileName} caused errors during the delete attempt`, err);
      if (shouldThrowError) {
        return Promise.reject(err);
      }
      return fileName;
    });
};

export const saveBufferToFile = (
  buff: Buffer,
  dir: string,
  fileName?: string
): Promise<string> => {
  const name = [".", dir, fileName || generateFileName()]
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

export const saveStreamToFile = (
  stream: IncomingMessage,
  dir: string,
  fileName?: string
): Promise<string> => {
  const name = `./${dir}/${fileName || generateFileName()}`;
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
  }).catch((err) => deleteFileIfExists(name, true, err));
};
