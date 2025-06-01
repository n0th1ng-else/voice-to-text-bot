import { createInterface } from "node:readline";
import { createTranslationsFileForLocale } from "../text/translations/loader.js";
import { Logger } from "../logger/index.js";

const logger = new Logger("locale-script");

const askLocale = (): Promise<string> => {
  const { promise, resolve } = Promise.withResolvers<string>();

  const reader = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  reader.question("Specify the locale to work with: ", (locale) => {
    reader.close();
    resolve(locale);
  });

  return promise;
};

const run = async (): Promise<void> => {
  logger.info("Asking the locale...");
  const locale = await askLocale();
  createTranslationsFileForLocale(locale);
  logger.info("The translation file is synced!");
};

await run();
