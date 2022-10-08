import cluster from "cluster";
import { appPort, clusterSize, ngRokToken, selfUrl } from "../env";
import { Logger } from "../logger";
import { run as runServer } from "./start";
import { getHostName } from "../server/tunnel";

const logger = new Logger("cluster");

export const run = (): void => {
  const launchTime = new Date().getTime();

  getHostName(appPort, selfUrl, ngRokToken).then((host) => {
    if (!cluster.isPrimary) {
      return;
    }

    const isCLusterSizeValid = clusterSize && clusterSize > 0;
    if (!isCLusterSizeValid) {
      logger.error(
        `Cluster size is not valid. Falling back to size=1. cLusterSize=${clusterSize}`,
        new Error("Cluster size is not valid")
      );
    }
    const size = isCLusterSizeValid ? clusterSize : 2;
    const spawnWorker = () => {
      const newWorker = cluster.fork({
        SELF_URL: host,
        LAUNCH_TIME: launchTime,
      });
      runServer(newWorker.id);
    };

    Array(size)
      .fill(null)
      .forEach(() => spawnWorker());

    const list = Object.keys(cluster.workers || {});
    logger.info(
      `Instance has spawned ${list.length} workers with IDs=${list.join(", ")}`
    );

    cluster.on("exit", (worker) => {
      logger.warn(
        `Thread ${worker.id} has died=${worker.isDead()}. Spawning a new one`
      );
      spawnWorker();
    });
  });
};
