import { fileURLToPath } from "node:url";
import { resolve as resolvePath } from "node:path";
import express from "express";

export const initStaticServer = (
  script: "import" | "chart",
): express.Express => {
  const currentDir = fileURLToPath(new URL(".", import.meta.url));
  const files = {
    html: resolvePath(currentDir, `../${script}/index.html`),
    js: resolvePath(currentDir, `../${script}/index.js`),
  };

  const app = express();
  app.use(express.json({ limit: "102400kb" }));

  app.get("/", (req: express.Request, res: express.Response) => {
    res.status(200).sendFile(files.html);
  });

  app.get("/index.js", (req: express.Request, res: express.Response) => {
    res.status(200).sendFile(files.js);
  });

  app.get("/favicon.ico", (_req, res: express.Response<string>) => {
    res.status(204).send("");
  });

  return app;
};
