const chalk = require("chalk");
const ngrok = require("ngrok");

async function createTunnel(port = 0, token) {
  const localHost = `https://localhost:${port}`;
  const host = await ngrok.connect({ authtoken: token, addr: localHost });
  console.log(chalk.green(`Started tunnel from ${host} to ${localHost}`));
  return host;
}

module.exports = { createTunnel };
