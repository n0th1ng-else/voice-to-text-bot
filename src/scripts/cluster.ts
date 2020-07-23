import cluster from "cluster";
import { appPort, clusterSize, ngRokToken, selfUrl } from "../env";
import { Logger } from "../logger";
import { run as runServer } from "./start";
import { getHostName } from "../server/tunnel";

const logger = new Logger("cluster");

export function run(): void {
  const launchTime = new Date().getTime();

  if (cluster.isMaster) {
    const isCLusterSizeValid = clusterSize && clusterSize > 0;
    if (!isCLusterSizeValid) {
      logger.error(
        `Cluster size is not valid. Falling back to size=1. cLusterSize=${clusterSize}`
      );
    }
    const size = isCLusterSizeValid ? clusterSize : 1;
    getHostName(appPort, selfUrl, ngRokToken).then((host) => {
      Array(size)
        .fill(null)
        .forEach(() =>
          cluster.fork({
            SELF_URL: host,
            LAUNCH_TIME: launchTime,
          })
        );
    });
  } else {
    runServer(cluster.worker.id);
  }

  cluster.on("exit", (worker) => {
    logger.warn(`Thread ${worker.id} has died. Spawning a new one`);
    cluster.fork();
  });
}
