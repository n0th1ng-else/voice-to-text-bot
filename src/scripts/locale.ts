import { createInterface } from "node:readline";
import { createTranslationsFileForLocale } from "../text/translations/loader.ts";
import { Logger } from "../logger/index.ts";

const logger = new Logger("locale-script");

const askLocale = (): Promise<string> => {
  return new Promise((resolve) => {
    const reader = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    reader.question("Specify the locale to work with: ", (locale) => {
      reader.close();
      resolve(locale);
    });
  });
};

const run = async (): Promise<void> => {
  logger.info("Asking the locale...");
  const locale = await askLocale();
  createTranslationsFileForLocale(locale);
  logger.info("The translation file is synced!");
};

await run();
