import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isBun } from "../engines/index.js";
import { BaseLogger } from "./utils.js";

const logger = new BaseLogger("prepare-engine");

// https://github.com/newrelic/node-newrelic/issues/1959#issuecomment-2975508504
const BUN_BANNED_FOLDERS = ["node_modules/@newrelic/native-metrics"] as const;

if (isBun()) {
  logger.info("Preparing for Bun runtime");
  const getAbsolutePath = (folder: string, prefix: string): string => {
    return fileURLToPath(new URL(`${prefix}/${folder}`, import.meta.url));
  };

  BUN_BANNED_FOLDERS.forEach((folder) => {
    const dest = getAbsolutePath(folder, "../../..");
    rmSync(dest, { recursive: true, force: true });
    logger.info(`[delete] deleted folder ${dest}`);
  });
}
