import { Logger } from "../logger/index.js";
import { sSuffix } from "../text/utils.js";

const logger = new Logger("tunnel");

const createTunnel = async (
  port: number,
  enableSSL: boolean,
  token?: string,
): Promise<string> => {
  logger.info("Creating tunnel");
  const localHost = `${sSuffix("http", enableSSL)}://localhost:${port}`;
  const { forward } = await import("@ngrok/ngrok");
  const host = await forward({
    addr: localHost,
    authtoken: token,
  });
  const url = host.url();
  if (!url) {
    throw new Error("Unable to create the tunnel! url is not set.");
  }
  logger.info(`Started tunnel from ${Logger.y(url)} to ${Logger.y(localHost)}`);
  logger.info(`Using the host ${Logger.y(url)}`);

  return url;
};

export const getHostName = async (
  port: number,
  selfUrl: string,
  enableSSL: boolean,
  ngRokToken?: string,
): Promise<string> => {
  if (selfUrl) {
    logger.info(`Using the host ${Logger.y(selfUrl)}`);
    return selfUrl;
  }

  return createTunnel(port, enableSSL, ngRokToken);
};
