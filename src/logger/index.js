function writeOutput(...message) {
  console.log(...message);
}

function writeError(...message) {
  console.error(...message);
}

class Logger {
  #id = "";

  constructor(id = "") {
    this.#id = id;
  }

  info(...message) {
    console.log(`[${this.#id}]`, ...message);
  }

  warn(...message) {
    console.warn(`[${this.#id}]`, ...message);
  }

  error(...message) {
    console.error(`[${this.#id}]`, ...message);
  }
}

module.exports = {
  writeError,
  writeOutput,
  Logger,
};
