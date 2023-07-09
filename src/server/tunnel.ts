import { connect } from "ngrok";
import { Logger } from "../logger/index.js";
import { sSuffix } from "../text/index.js";

const logger = new Logger("tunnel");

const createTunnel = (
  port: number,
  enableSSL: boolean,
  token?: string,
): Promise<string> => {
  logger.info("Creating tunnel");
  const localHost = `${sSuffix("http", enableSSL)}://localhost:${port}`;
  return connect({ authtoken: token, addr: localHost }).then((host) => {
    logger.info(
      `Started tunnel from ${Logger.y(host)} to ${Logger.y(localHost)}`,
    );
    logger.info(`Using the host ${Logger.y(host)}`);
    return host;
  });
};

export const getHostName = (
  port: number,
  selfUrl: string,
  enableSSL: boolean,
  ngRokToken?: string,
): Promise<string> => {
  if (selfUrl) {
    logger.info(`Using the host ${Logger.y(selfUrl)}`);
    return Promise.resolve(selfUrl);
  }

  return createTunnel(port, enableSSL, ngRokToken);
};
