import { resolve as resolvePath } from "path";
import { readFileSync } from "fs";

const cert = resolvePath(__dirname, "./selfsigned");

export const httpsCert = readFileSync(`${cert}.crt`);
export const httpsKey = readFileSync(`${cert}.key`);

export interface HttpsOptions {
  cert: Buffer;
  key: Buffer;
}
