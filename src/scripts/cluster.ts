import cluster from "node:cluster";
import { appPort, clusterSize, ngRokToken, selfUrl } from "../env";
import { Logger } from "../logger";
import { run as runServer } from "./start";
import { getHostName } from "../server/tunnel";

const logger = new Logger("cluster");

export const run = (): void => {
  const launchTime = new Date().getTime();

  const spawnInstance = (host: string, time: number) => {
    logger.info("Spawning a new thread", { host, time });
    cluster.fork({
      SELF_URL: host,
      LAUNCH_TIME: time,
    });
  };

  getHostName(appPort, selfUrl, ngRokToken).then((host) => {
    if (cluster.isMaster) {
      const isCLusterSizeValid = clusterSize && clusterSize > 0;
      if (!isCLusterSizeValid) {
        logger.error(
          `Cluster size is not valid. Falling back to size=1. cLusterSize=${clusterSize}`,
          new Error("Cluster size is not valid")
        );
      }
      const size = isCLusterSizeValid ? clusterSize : 1;

      Array(size)
        .fill(null)
        .forEach(() => {
          spawnInstance(host, launchTime);
        });

      cluster.on("exit", (worker, code, signal) => {
        logger.warn(`One thread has died. Spawning a new one`, {
          code,
          signal,
          threadId: worker.id,
        });
        spawnInstance(host, launchTime);
      });
    } else {
      // @ts-expect-error We are inside worker, worker is defined
      runServer(cluster.worker.id);
    }
  });
};
