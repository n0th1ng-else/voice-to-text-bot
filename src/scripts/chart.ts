import express from "express";
import { createServer as createHttps } from "https";
import { createServer as createHttp } from "http";
import { resolve as resolvePath } from "path";
import { Logger } from "../logger";
import { appPort, enableSSL } from "../env";
import { httpsCert, httpsKey } from "../../certs";

export function run(): void {
  const logger = new Logger("chart");

  const chartHtml = resolvePath(__dirname, "../chart/index.html");

  const app = express();
  app.use(express.json());

  app.get("/", (req: express.Request, res: express.Response) => {
    res.status(200).sendFile(chartHtml);
  });

  logger.info(`Starting ${logger.y(`http${enableSSL ? "s" : ""}`)} server`);

  const httpsOptions = {
    cert: httpsCert,
    key: httpsKey,
  };

  const server = enableSSL ? createHttps(httpsOptions, app) : createHttp(app);

  server.listen(appPort, () => {
    logger.info(`Express server is listening on ${logger.y(appPort)}`);
  });
}
