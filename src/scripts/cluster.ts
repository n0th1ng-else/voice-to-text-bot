import cluster from "node:cluster";
import * as envy from "../env.js";
import { Logger } from "../logger/index.js";
import { run as runServer } from "./start.js";
import { getHostName } from "../server/tunnel.js";

const logger = new Logger("cluster");

const spawnInstance = (host: string, time: number): void => {
  logger.info("Spawning a new thread", { host, time });
  cluster.fork({
    SELF_URL: host,
    LAUNCH_TIME: time,
  });
};

export const run = async (): Promise<void> => {
  const launchTime = new Date().getTime();

  const host = await getHostName(envy.appPort, envy.selfUrl, envy.enableSSL, envy.ngRokToken);

  let clusterSize = envy.clusterSize;
  const isCLusterSizeValid = clusterSize && clusterSize > 0;

  if (!isCLusterSizeValid) {
    clusterSize = 1;
    logger.error(
      `Cluster size is not valid. Falling back to size=1. cLusterSize=${envy.clusterSize}`,
      new Error("Cluster size is not valid"),
    );
  }

  if (clusterSize === 1) {
    logger.warn(
      "Cluster size is set to 1. Running the application in a single thread",
      undefined,
      true,
    );
    await runServer();
    return;
  }

  if (cluster.isPrimary) {
    Array.from({ length: clusterSize })
      .fill(null)
      .forEach(() => {
        spawnInstance(host, launchTime);
      });

    cluster.on("fork", (worker) => {
      logger.warn(
        "Spawned a new thread",
        {
          threadId: worker.id,
        },
        true,
      );
    });

    cluster.on("exit", (worker, code, signal) => {
      logger.warn(
        "One thread has died. Spawning a new one",
        {
          code,
          signal,
          threadId: worker.id,
        },
        true,
      );
      spawnInstance(host, launchTime);
    });
  } else {
    // @ts-expect-error We are inside worker, worker is defined
    await runServer(cluster.worker.id);
  }
};
