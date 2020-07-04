import express from "express";
import { createServer as createHttps } from "https";
import { createServer as createHttp } from "http";
import { resolve as resolvePath } from "path";
import { Logger } from "../logger";
import { appPort, enableSSL } from "../env";
import { httpsCert, httpsKey } from "../../certs";
import { sSuffix } from "../text";

const logger = new Logger("chart-script");

export function run(): void {
  const chartHtml = resolvePath(__dirname, "../chart/index.html");

  const app = express();
  app.use(express.json());

  app.get("/", (req: express.Request, res: express.Response) => {
    res.status(200).sendFile(chartHtml);
  });

  logger.info(`Starting ${Logger.y(sSuffix("http", enableSSL))} server`);

  const httpsOptions = {
    cert: httpsCert,
    key: httpsKey,
  };

  const server = enableSSL ? createHttps(httpsOptions, app) : createHttp(app);

  server.listen(appPort, () => {
    logger.info(`Express server is listening on ${Logger.y(appPort)}`);
  });
}
