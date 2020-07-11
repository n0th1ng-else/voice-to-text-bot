import { connect } from "ngrok";
import { Logger } from "../logger";

const logger = new Logger("tunnel");

function createTunnel(port: number, token?: string): Promise<string> {
  logger.info("Creating tunnel");
  const localHost = `https://localhost:${port}`;
  return connect({ authtoken: token, addr: localHost }).then((host) => {
    logger.info(
      `Started tunnel from ${Logger.y(host)} to ${Logger.y(localHost)}`
    );
    logger.info(`Using the host ${Logger.y(host)}`);
    return host;
  });
}

export function getHostName(
  port: number,
  selfUrl?: string,
  ngRokToken?: string
): Promise<string> {
  if (selfUrl) {
    logger.info(`Using the host ${Logger.y(selfUrl)}`);
    return Promise.resolve(selfUrl);
  }

  return createTunnel(port, ngRokToken);
}
