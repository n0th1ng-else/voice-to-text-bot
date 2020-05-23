const { ExpressServer } = require("../server/express");
const envy = require("../../env.json");

(async function start() {
  const server = new ExpressServer();

  server.start(envy.PORT, envy.USE_SSL === "true");
})();
