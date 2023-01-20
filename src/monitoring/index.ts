import { promises } from "fs";
import { resolve as resolvePath } from "path";
import { platform } from "os";
import { Logger } from "../logger";
import { isFileExist } from "../files";

const logger = new Logger("monitoring");

export const launchMonitoringAgent = (token: string, infra: string) => {
  logger.info("Generating monitoring config");

  if (!token) {
    logger.error(
      "No monitoring token specified. Skipping the monitoring agent initialization...",
      new Error("No monitoring token specified")
    );
    return Promise.resolve();
  }

  if (!infra) {
    logger.error(
      "No infra token specified. Skipping the monitoring agent initialization...",
      new Error("No infra token specified")
    );
    return Promise.resolve();
  }

  const rootDir = process.cwd();
  const dbDir = resolvePath(rootDir, "spmdb");
  const logsDir = resolvePath(rootDir, "spmlogs");
  const cfgFile = resolvePath(rootDir, ".spmagentrc");

  const isLinux = platform() === "linux";
  const cfg = [
    `dbDir: ${dbDir}`,
    `useLinuxAgent: ${isLinux ? "true" : "false"}`,
    "",
    "tokens:",
    `  monitoring: ${token}`,
    `  infra: ${infra}`,
    "",
    "logger:",
    `  dir: ${logsDir}`,
    "  silent: true",
    "",
  ].join("\n");

  return isFileExist(cfgFile)
    .then((isExists) => {
      if (isExists) {
        logger.warn("Using the existing monitoring config file...");
        return;
      }

      return promises.writeFile(cfgFile, cfg);
    })
    .then(() => {
      logger.info("Monitoring config saved successfully");
      return import("spm-agent-nodejs");
    })
    .catch((err) => {
      logger.error("Failed to run the spm agent", err);
    });
};
