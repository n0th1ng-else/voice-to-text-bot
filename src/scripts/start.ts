import * as envy from "../env.js";
import { Logger } from "../logger/index.js";
import { getLaunchDelay } from "../common/timer.js";
import { prepareInstance, prepareStopListener } from "../server/boot.js";
import type { BotServerModel } from "../server/types.js";

const logger = new Logger("start-script");

const startServer = async (
  server: BotServerModel,
  threadId: number,
): Promise<void> => {
  const launchDelay = getLaunchDelay(threadId);
  const stopListener = prepareStopListener();

  return server.start().then((stopFn) => {
    stopListener.addTrigger(stopFn);
    return server.triggerDaemon(
      envy.nextReplicaUrl,
      envy.replicaLifecycleInterval,
      launchDelay,
    );
  });
};

export const run = async (threadId = 0): Promise<void> => {
  return prepareInstance(threadId)
    .then((server) => startServer(server, threadId))
    .catch((err) => logger.error("Failed to run the server", err));
};
