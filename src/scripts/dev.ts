import { Logger } from "../logger/index.js";
import { getLaunchDelay } from "../common/timer.js";
import { prepareInstance, prepareStopListener } from "../server/boot.js";
import type { BotServerModel } from "../server/types.js";

const logger = new Logger("dev-script");

const startServer = async (server: BotServerModel, threadId: number): Promise<void> => {
  const launchDelay = getLaunchDelay(threadId);
  const stopListener = await prepareStopListener();

  await server.applyHostLocation(launchDelay);
  const onStop = await server.start();
  stopListener.addTrigger(() => onStop());
};

export const run = async (threadId = 0): Promise<void> => {
  try {
    const server = await prepareInstance(threadId);
    await startServer(server, threadId);
  } catch (err) {
    logger.error("Failed to run dev instance", err);
  }
};
