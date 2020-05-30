import { resolve as resolvePath } from "path";
import { readFileSync, existsSync } from "fs";

const cert = resolvePath(__dirname, "./selfsigned");
const certPath = `${cert}.crt`;
const keyPath = `${cert}.key`;

export const httpsCert =
  (existsSync(certPath) && readFileSync(certPath)) || undefined;
export const httpsKey =
  (existsSync(keyPath) && readFileSync(keyPath)) || undefined;

export interface HttpsOptions {
  cert?: Buffer;
  key?: Buffer;
}
