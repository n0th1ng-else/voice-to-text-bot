import express from "express";
import { createServer as createHttps } from "https";
import { createServer as createHttp } from "http";
import { resolve as resolvePath } from "path";
import { Logger } from "../logger";
import { appPort, dbPostgres, enableSSL } from "../env";
import { sSuffix } from "../text";
import { httpsOptions } from "../../certs";
import { DbClient } from "../db";

const logger = new Logger("import-script");

export function run(): void {
  const chartHtml = resolvePath(__dirname, "../import/index.html");

  const app = express();
  app.use(express.json({ limit: "10240kb" }));

  app.get("/", (req: express.Request, res: express.Response) => {
    res.status(200).sendFile(chartHtml);
  });

  const db = new DbClient({
    user: dbPostgres.user,
    password: dbPostgres.password,
    host: dbPostgres.host,
    database: dbPostgres.database,
    port: dbPostgres.port,
  });

  let inProgress = false;
  let rowsTotal = 0;
  let rowsDone = 0;

  const importRows = async (items) => {
    rowsTotal = items.length;
    rowsDone = 0;
    inProgress = true;

    do {
      const item = items.shift();
      if (!item) {
        throw new Error("Unable to get the item for import");
      }
      await db.usages
        .importRow(
          item.chatId,
          item.usageCount,
          item.langId,
          item.user,
          new Date(item.createdAt),
          new Date(item.updatedAt)
        )
        .catch((err) => logger.error("import error", err));

      rowsDone++;
    } while (rowsDone < rowsTotal);

    logger.info("Import completed");
    inProgress = false;
  };

  app.post("/import", (req: express.Request, res: express.Response) => {
    try {
      const file = req.body;
      importRows(file.results);
      res.status(200).send({});
    } catch (err) {
      logger.error("err", err);
      inProgress = false;
      rowsTotal = 0;
      rowsDone = 0;
      res.status(400).send(err);
    }
  });

  app.get("/status", (req: express.Request, res: express.Response) => {
    res.status(200).send({
      idle: !inProgress,
      total: rowsTotal,
      done: rowsDone,
    });
  });

  logger.info(`Starting ${Logger.y(sSuffix("http", enableSSL))} server`);

  const server = enableSSL ? createHttps(httpsOptions, app) : createHttp(app);

  db.init().then(() =>
    server.listen(appPort, () => {
      logger.info(`Express server is listening on ${Logger.y(appPort)}`);
    })
  );
}
