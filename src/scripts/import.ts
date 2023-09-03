import { createServer as createHttps } from "node:https";
import { createServer as createHttp } from "node:http";
import express from "express";
import { Logger } from "../logger/index.js";
import * as envy from "../env.js";
import { sSuffix } from "../text/utils.js";
import { httpsOptions } from "../../certs/index.js";
import { getDb } from "../db/index.js";
import { initStaticServer } from "../server/static.js";

const logger = new Logger("import-script");

type ImportRow = {
  chatId: number;
  usageCount: number;
  langId: string;
  user: string;
  createdAt: string;
  updatedAt: string;
};

export const run = async (): Promise<void> => {
  const app = initStaticServer("import");

  const db = getDb([
    {
      user: envy.dbPostgres.user,
      password: envy.dbPostgres.password,
      host: envy.dbPostgres.host,
      database: envy.dbPostgres.database,
      port: envy.dbPostgres.port,
      certificate: envy.dbPostgres.cert,
    },
  ]);

  let inProgress = false;
  let rowsTotal = 0;
  let rowsDone = 0;

  const importRows = async (items: ImportRow[]) => {
    rowsTotal = items.length;
    rowsDone = 0;
    inProgress = true;

    do {
      const item = items.shift();
      if (!item) {
        throw new Error("Unable to get the item for import");
      }
      await db
        .importUsageRow(
          item.chatId,
          item.usageCount,
          item.langId,
          item.user,
          new Date(item.createdAt),
          new Date(item.updatedAt),
        )
        .catch((err) => logger.error("import error", err));

      rowsDone++;
    } while (rowsDone < rowsTotal);

    logger.info("Import completed");
    inProgress = false;
  };

  app.post(
    "/import",
    (
      req: express.Request<unknown, unknown, { results: ImportRow[] }>,
      res: express.Response,
    ) => {
      const { results } = req.body;
      importRows(results)
        .then(() => {
          res.status(200).send({});
        })
        .catch((err: unknown) => {
          logger.error("err", err);
          inProgress = false;
          rowsTotal = 0;
          rowsDone = 0;
          res.status(400).send(err);
        });
    },
  );

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

  await db.init();
  server.listen(envy.appPort, () => {
    logger.info(`Express server is listening on ${Logger.y(envy.appPort)}`);
  });
};
