import { Logger } from "../logger/index.js";
import * as envy from "../env.js";
import { sSuffix } from "../text/utils.js";
import { getDb } from "../db/index.js";
import { initStaticServer, type FastifyStaticRoute } from "../server/static.js";

const logger = new Logger("import-script");

type ImportPayload = {
  results: ImportRow[];
};

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

  app.post<FastifyStaticRoute<ImportPayload>>("/import", async (req, res) => {
    const { results } = req.body;
    await importRows(results)
      .then(() => res.status(200).send({ result: "ok" }))
      .catch((err: unknown) => {
        logger.error("err", err);
        inProgress = false;
        rowsTotal = 0;
        rowsDone = 0;

        return res
          .status(500)
          .send({ result: "error", error: "Something went wrong" });
      });
  });

  app.get("/status", async (_, res) => {
    await res.status(200).send({
      idle: !inProgress,
      total: rowsTotal,
      done: rowsDone,
    });
  });

  logger.info(`Starting ${Logger.y(sSuffix("http", envy.enableSSL))} server`);

  await db.init();

  try {
    const fullUrl = await app.listen({ port: envy.appPort });
    logger.info(`Server is listening on ${Logger.y(fullUrl)}`);
  } catch {
    process.exit(1);
  }
};
