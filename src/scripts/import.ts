import { createServer as createHttps } from "node:https";
import { createServer as createHttp } from "node:http";
import { resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Logger } from "../logger/index.js";
import * as envy from "../env.js";
import { sSuffix } from "../text/index.js";
import { httpsOptions } from "../../certs/index.js";
import { DbClient } from "../db/index.js";

const logger = new Logger("import-script");

export const run = async (): Promise<void> => {
  const currentDir = fileURLToPath(new URL(".", import.meta.url));
  const chartHtml = resolvePath(currentDir, "../import/index.html");

  const app = express();
  app.use(express.json({ limit: "10240kb" }));

  app.get("/", (req: express.Request, res: express.Response) => {
    res.status(200).sendFile(chartHtml);
  });

  const db = new DbClient({
    user: envy.dbPostgres.user,
    password: envy.dbPostgres.password,
    host: envy.dbPostgres.host,
    database: envy.dbPostgres.database,
    port: envy.dbPostgres.port,
    certificate: envy.dbPostgres.cert,
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

  app.post("/import", async (req: express.Request, res: express.Response) => {
    try {
      const file = req.body;
      await importRows(file.results);
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

  logger.info(`Starting ${Logger.y(sSuffix("http", envy.enableSSL))} server`);

  const server = envy.enableSSL
    ? createHttps(httpsOptions, app)
    : createHttp(app);

  db.init().then(() =>
    server.listen(envy.appPort, () => {
      logger.info(`Express server is listening on ${Logger.y(envy.appPort)}`);
    })
  );
};
