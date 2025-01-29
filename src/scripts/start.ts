import * as envy from "../env.ts";
import { Logger } from "../logger/index.ts";
import { getLaunchDelay } from "../common/timer.ts";
import { prepareInstance, prepareStopListener } from "../server/boot.ts";
import type { BotServerModel } from "../server/types.ts";

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
