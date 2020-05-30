import { connect } from "ngrok";
import { selfUrl, appPort, ngRokToken } from "../env";
import { Logger } from "../logger";

const logger = new Logger("tunnel");

function createTunnel(port: number, token: string): Promise<string> {
  logger.info("Creating tunnel");
  const localHost = `https://localhost:${port}`;
  return connect({ authtoken: token, addr: localHost }).then((host) => {
    logger.info(logger.g(`Started tunnel from ${host} to ${localHost}`));
    logger.info(`Using the host ${host}`);
    return host;
  });
}

export function getHostName(): Promise<string> {
  if (selfUrl) {
    logger.info(`Using the host ${selfUrl}`);
    return Promise.resolve(selfUrl);
  }

  return createTunnel(appPort, ngRokToken);
}
