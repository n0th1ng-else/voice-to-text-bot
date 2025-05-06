import { readFileSync } from "node:fs";
import Fastify, { type FastifyInstance } from "fastify";
import { httpsOptions } from "../../certs/index.js";
import { enableSSL } from "../env.js";
import { getMB } from "../memory/index.js";
import { getStaticFilePaths, type UIComponent } from "../ui/ui.js";

export type FastifyStaticRoute<Body = void, Query = void, Reply = void> = {
  Body: Body;
  Querystring: Query;
  Reply: Reply | { result: "ok" } | { result: "error"; error: string };
};

export const initStaticServer = (script: UIComponent): FastifyInstance => {
  const files = getStaticFilePaths(script);

  const httpsOpts = enableSSL
    ? {
        https: httpsOptions,
      }
    : {};

  const app = Fastify({
    ...httpsOpts,
    bodyLimit: getMB(100), // 100 MB
  });

  app.get("/", async (_, res) => {
    const bufferIndexHtml = readFileSync(files.html);
    await res.type("text/html").send(bufferIndexHtml);
  });

  app.get("/index.js", async (_, res) => {
    const bufferIndexHtml = readFileSync(files.js);
    await res.type("application/javascript").send(bufferIndexHtml);
  });

  app.get("/favicon.ico", async (_, res) => {
    await res.status(204).send("");
  });

  return app;
};
