import { resolve as resolvePath } from "path";
import { readFileSync, existsSync } from "fs";

const cert = resolvePath(__dirname, "./selfsigned");
const certPath = `${cert}.crt`;
const keyPath = `${cert}.key`;

const httpsCert = (existsSync(certPath) && readFileSync(certPath)) || undefined;
const httpsKey = (existsSync(keyPath) && readFileSync(keyPath)) || undefined;

export const httpsOptions: HttpsOptions = {
  cert: httpsCert,
  key: httpsKey,
};

export interface HttpsOptions {
  cert?: Buffer;
  key?: Buffer;
}
