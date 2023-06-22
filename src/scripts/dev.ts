import { Logger } from "../logger/index.js";
import { ExpressServer } from "../server/express.js";
import { getLaunchDelay } from "../common/timer.js";
import { prepareInstance, prepareStopListener } from "../server/boot.js";
import { flattenPromise } from "../common/helpers.js";

const logger = new Logger("dev-script");

const startServer = (
  server: ExpressServer,
  threadId: number
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
  prepareInstance(threadId)
    .then((server) => startServer(server, threadId))
    .catch((err) => logger.error("Failed to run dev instance", err));
};
