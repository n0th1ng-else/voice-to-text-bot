const chalk = require("chalk");
const ngrok = require("ngrok");
const { writeOutput } = require("../logger");

function createTunnel(port, token) {
  writeOutput("Creating tunnel");
  const localHost = `https://localhost:${port}`;
  return ngrok.connect({ authtoken: token, addr: localHost }).then((host) => {
    writeOutput(chalk.green(`Started tunnel from ${host} to ${localHost}`));
    writeOutput(`Using the host ${host}`);
    return host;
  });
}

function getHostName(environmentVars) {
  const selfUrl = environmentVars.SELF_URL;
  if (selfUrl) {
    writeOutput(`Using the host ${selfUrl}`);
    return Promise.resolve(selfUrl);
  }

  const port = environmentVars.PORT;
  const ngrokToken = environmentVars.NGROK_TOKEN;

  return createTunnel(port, ngrokToken);
}

module.exports = { getHostName };
