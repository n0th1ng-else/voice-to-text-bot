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

const logger = new Logger("chart-script");

export const run = (): void => {
  const currentDir = fileURLToPath(new URL(".", import.meta.url));
  const files = {
    html: resolvePath(currentDir, "../chart/index.html"),
    js: resolvePath(currentDir, "../chart/index.js"),
  };

  let db: DbClient | null = null;

  const app = express();
  app.use(express.json());

  app.get("/", (req: express.Request, res: express.Response) => {
    res.status(200).sendFile(files.html);
  });

  app.get("/index.js", (req: express.Request, res: express.Response) => {
    res.status(200).sendFile(files.js);
  });

  app.post("/db", (req: express.Request, res: express.Response) => {
    if (db) {
      res.status(200).send({});
      return;
    }
    db = new DbClient({
      user: req.body.user,
      password: req.body.pwd,
      host: req.body.host,
      database: req.body.user,
      port: req.body.port,
    });

    res.status(200).send({});
  });

  app.get("/stat", (req: express.Request, res: express.Response) => {
    const usageCount = Number(req.query.usage);

    if (!usageCount && usageCount !== 0) {
      res
        .status(400)
        .send({ message: "Wrong usage parameter. Number expected" });
      return;
    }

    const from = Number(req.query.from);
    if (!from) {
      res
        .status(400)
        .send({ message: "Wrong from parameter. Number expected" });
      return;
    }

    const to = Number(req.query.to);
    if (!to) {
      res.status(400).send({ message: "Wrong to parameter. Number expected" });
      return;
    }

    if (!db) {
      res.status(400).send({ message: "DB is not initialized" });
      return;
    }

    db.usages
      .statRows(new Date(from), new Date(to), usageCount)
      .then((rows) => {
        res.status(200).send({ items: rows, total: rows.length });
      })
      .catch((err) => {
        logger.error("Unable to select rows", err);
        res.status(500).send({ message: "Something went wrong" });
      });
  });

  logger.info(`Starting ${Logger.y(sSuffix("http", envy.enableSSL))} server`);

  const server = envy.enableSSL
    ? createHttps(httpsOptions, app)
    : createHttp(app);

  server.listen(envy.appPort, () => {
    logger.info(`Express server is listening on ${Logger.y(envy.appPort)}`);
  });
};
