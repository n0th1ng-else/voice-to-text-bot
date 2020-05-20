function writeOutput(...message) {
  console.log(...message);
}

function writeError(...message) {
  console.error(...message);
}

module.exports = {
  writeError,
  writeOutput,
};
