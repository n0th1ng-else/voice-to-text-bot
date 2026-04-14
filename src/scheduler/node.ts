import { ScheduleDaemon } from "./index.js";
import { requestHealthData } from "../server/api.js";
import { type BotServerModel, HealthStatus } from "../server/types.js";
import { Logger } from "../logger/index.js";

const logger = new Logger("node");

export const initNodeDaemon = (selfUrl: string, server: BotServerModel): ScheduleDaemon => {
  return new ScheduleDaemon(
    "node",
    async () => {
      const health = await requestHealthData(selfUrl);
      if (health.status !== HealthStatus.Online) {
        logger.error("Node status is not ok", health);
        throw new Error("Node status is not ok");
      }
      logger.info(`Ping completed with result: ${Logger.y(health.status)}`);
      const isCallbackOwner = health.urls.every((url) => url.includes(selfUrl));

      if (!isCallbackOwner) {
        logger.warn(
          `Callback is not owned by ${Logger.y("this")} node`,
          {
            selfUrl,
            urls: health.urls,
          },
          true,
        );

        await server.applyHostLocation();
      }
    },
    {
      skipInitialTick: true,
    },
  );
};
