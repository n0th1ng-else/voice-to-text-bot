// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("node:path");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { promisify } = require("node:util");

/**
 * Whisper output.
 * Each item is a tuple [timeStart, timeEnd, text]
 *
 * @typedef {[string, string, string]} WhisperResultItem
 */

/**
 * Whisper input Parameters.
 *
 * @typedef {Object} WhisperOptions
 * @property {import("./utils.ts").WhisperSupportedLanguage} language - The recognition language
 * @property {string} model - The absolute file path for the trained model
 * @property {string} [fname_inp] - The absolute file path for the WAV file
 * @property {Buffer} [pcmf32] - Raw pcm32 Buffer instead of fname_inp
 * @property {boolean} use_gpu - Toggles the GPU usage
 * @property {boolean} flash_attn - Enable Flash attention support algorithm
 * @property {boolean} no_prints - Do not print system info
 * @property {boolean} comma_in_time
 * @property {boolean} translate - Translate the recognized text?
 * @property {boolean} no_timestamps
 * @property {number} audio_ctx
 */

/**
 * Initialize the Whisper as an addon. The easiest way is to just require it in the CommonJS module.
 * Then we can use it everywhere.
 * @param addonArchitecture {import("./utils.js").WhisperAddonArchitecture} - language code for recognition
 *
 * @return {(opts: WhisperOptions) => Promise<WhisperResultItem[]>}
 */
module.exports = (addonArchitecture) => {
  // Addon version: 31aea563a83803c710691fed3e8d700e06ae6788
  const addOnPath = path.join(
    __dirname,
    `./addons/whisper-processor.${addonArchitecture}.node`,
  );
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { whisper } = require(addOnPath);
  return promisify(whisper);
};
