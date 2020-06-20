const { existsSync } = require("fs");
const { resolve } = require("path");

const options = [...process.argv];
const fileExt = options.pop();
const fileName = options.pop();
const file = `${fileName}.${fileExt}`;
const scriptPath = fileExt && fileName && resolve(__dirname, file);

if (scriptPath && existsSync(scriptPath)) {
  const { run } = require(scriptPath);
  run();
} else {
  throw new Error(`Unable to find script "${file}" in "${scriptPath}"`);
}
