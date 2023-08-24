import { resolve as resolvePath } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

const cert = resolvePath(currentDir, "./selfsigned");
const certPath = `${cert}.crt`;
const keyPath = `${cert}.key`;

const httpsCert = (existsSync(certPath) && readFileSync(certPath)) || undefined;
const httpsKey = (existsSync(keyPath) && readFileSync(keyPath)) || undefined;

export const httpsOptions: HttpsOptions = {
  cert: httpsCert,
  key: httpsKey,
};

export type HttpsOptions = {
  cert?: Buffer;
  key?: Buffer;
};
