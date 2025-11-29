import { Logger } from "../logger/index.js";
import * as envy from "../env.js";
import { sSuffix } from "../text/utils.js";
import { getDb } from "../db/index.js";
import { initStaticServer, type FastifyStaticRoute } from "../server/static.js";
import type { UsageRowScheme } from "../db/sql/usages.js";

type LoginPayload = {
  user: string;
  pwd: string;
  host: string;
  port: number;
  database: string;
};

type SearchQuery = {
  usage: string;
  from: string;
  to: string;
};

type SearchResult = {
  items: UsageRowScheme[];
  total: number;
};

const logger = new Logger("chart-script");

export const run = async (): Promise<void> => {
  const app = initStaticServer("chart");

  let db: ReturnType<typeof getDb> | null = null;

  app.post<FastifyStaticRoute<LoginPayload>>("/login", async (req, res) => {
    if (db) {
      await res.status(200).send({ result: "ok" });
      return;
    }
    const { user, pwd, host, port, database } = req.body;
    if ([user, pwd, host, port, database].filter(Boolean).length !== 5) {
      await res.status(400).send({
        result: "error",
        error: "Wrong credentials",
      });
      return;
    }
    db = getDb([
      {
        user,
        host,
        port,
        database,
        password: pwd,
      },
    ]);

    await res.status(200).send({ result: "ok" });
  });

  app.delete<FastifyStaticRoute>("/login", async (_, res) => {
    db = null;
    await res.status(200).send({ result: "ok" });
  });

  app.get<FastifyStaticRoute<void, SearchQuery, SearchResult>>("/stat", async (req, res) => {
    const usageCount = Number(req.query.usage);

    if (!usageCount && usageCount !== 0) {
      await res.status(400).send({
        result: "error",
        error: "Wrong usage parameter. Number expected",
      });
      return;
    }

    const from = Number(req.query.from);
    if (!from) {
      await res.status(400).send({
        result: "error",
        error: "Wrong from parameter. Number expected",
      });
      return;
    }

    const to = Number(req.query.to);
    if (!to) {
      await res.status(400).send({
        result: "error",
        error: "Wrong to parameter. Number expected",
      });
      return;
    }

    if (!db) {
      await res.status(400).send({
        result: "error",
        error: "DB is not initialized",
      });
      return;
    }

    await db
      .fetchUsageRows(new Date(from), new Date(to), usageCount)
      .then((rows) => {
        return res.status(200).send({ items: rows, total: rows.length });
      })
      .catch((err) => {
        logger.error("Unable to select rows", err);
        return res.status(500).send({
          result: "error",
          error: "Something went wrong",
        });
      });
  });

  logger.info(`Starting ${Logger.y(sSuffix("http", envy.enableSSL))} server`);

  try {
    const fullUrl = await app.listen({
      port: envy.appPort,
    });
    logger.info(`Server is listening on ${Logger.y(fullUrl)}`);
  } catch {
    process.exit(1);
  }
};
