import "newrelic";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

const options = [...process.argv];
const fileExt = options.pop();
const fileName = options.pop();
const file = `${fileName}.${fileExt}`;
const scriptPath = fileExt && fileName && resolve(currentDir, file);

if (scriptPath && existsSync(scriptPath)) {
  const scriptModule = await import(scriptPath);
  scriptModule.run();
} else {
  throw new Error(`Unable to find script "${file}" in "${scriptPath}"`);
}
