import { Logger } from "../logger/index.ts";
import { getLaunchDelay } from "../common/timer.ts";
import { prepareInstance, prepareStopListener } from "../server/boot.ts";
import { flattenPromise } from "../common/helpers.ts";
import type { BotServerModel } from "../server/types.ts";

const logger = new Logger("dev-script");

const startServer = async (
  server: BotServerModel,
  threadId: number,
): Promise<void> => {
  const launchDelay = getLaunchDelay(threadId);
  const stopListener = prepareStopListener();

  return server
    .applyHostLocation(launchDelay)
    .then(() => server.start())
    .then((onStop) => stopListener.addTrigger(() => onStop()))
    .then(flattenPromise);
};

export const run = async (threadId = 0): Promise<void> => {
  return prepareInstance(threadId)
    .then((server) => startServer(server, threadId))
    .catch((err) => logger.error("Failed to run dev instance", err));
};
