import cluster from "node:cluster";
import "newrelic";
import pg from "pg";
import newrelic from "newrelic";
import * as envy from "../env";
import { Logger } from "../logger";
import { run as runServer } from "./start";
import { getHostName } from "../server/tunnel";

const logger = new Logger("cluster");

export const run = (): void => {
  newrelic.instrumentLoadedModule("pg", pg);
  const launchTime = new Date().getTime();

  const spawnInstance = (host: string, time: number) => {
    logger.info("Spawning a new thread", { host, time });
    cluster.fork({
      SELF_URL: host,
      LAUNCH_TIME: time,
    });
  };

  getHostName(envy.appPort, envy.enableSSL, envy.selfUrl, envy.ngRokToken).then(
    (host) => {
      if (cluster.isMaster) {
        const isCLusterSizeValid = envy.clusterSize && envy.clusterSize > 0;
        if (!isCLusterSizeValid) {
          logger.error(
            `Cluster size is not valid. Falling back to size=1. cLusterSize=${envy.clusterSize}`,
            new Error("Cluster size is not valid")
          );
        }
        const size = isCLusterSizeValid ? envy.clusterSize : 1;

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
    }
  );
};
