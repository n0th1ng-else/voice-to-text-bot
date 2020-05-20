const path = require("path");
const fs = require("fs");

const cert = path.resolve(__dirname, "./selfsigned");

module.exports = {
  cert: fs.readFileSync(`${cert}.crt`),
  key: fs.readFileSync(`${cert}.key`),
};
