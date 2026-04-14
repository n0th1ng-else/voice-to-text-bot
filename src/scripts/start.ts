import * as envy from "../env.js";
import { Logger } from "../logger/index.js";
import { getLaunchDelay } from "../common/timer.js";
import { prepareInstance, prepareStopListener } from "../server/boot.js";
import type { BotServerModel } from "../server/types.js";

const logger = new Logger("start-script");

const startServer = async (server: BotServerModel, threadId: number): Promise<void> => {
  const launchDelay = getLaunchDelay(threadId);
  const stopListener = await prepareStopListener();
  const stopFn = await server.start();
  stopListener.addTrigger(stopFn);
  await server.triggerDaemon(envy.nextReplicaUrl, envy.replicaLifecycleInterval, launchDelay);
};

export const run = async (threadId = 0): Promise<void> => {
  try {
    const server = await prepareInstance(threadId);
    await startServer(server, threadId);
  } catch (err) {
    logger.error("Failed to run the server", err);
  }
};
