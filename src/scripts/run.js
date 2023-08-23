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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const scriptModule = await import(scriptPath);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await scriptModule.run();
} else {
  throw new Error(`Unable to find script "${file}" in "${scriptPath}"`);
}
