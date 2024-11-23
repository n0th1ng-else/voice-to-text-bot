import { fileURLToPath } from "node:url";
import { cpSync } from "node:fs";
import { Logger } from "./src/logger/index.js";

const logger = new Logger("file-copy");

const FOLDERS = ["text/translations/bundles", "whisper/addons"] as const;

const getAbsolutePath = (folder: string, prefix: string): string => {
  return fileURLToPath(new URL(`${prefix}/${folder}`, import.meta.url));
};

FOLDERS.forEach((folder) => {
  const src = getAbsolutePath(folder, "../src");
  const dest = getAbsolutePath(folder, "./src");
  cpSync(src, dest, { recursive: true });
  logger.info(`[copy] Copied ${src} to ${dest}`);
});
