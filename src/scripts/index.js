require("ts-node").register();

const scriptName = process.argv[process.argv.length - 1];

require(`./${scriptName}.ts`).run();
