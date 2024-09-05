import { fileURLToPath } from "node:url";
import { join as joinPath } from "node:path";
import type { LanguageCode } from "../recognition/types.js";
import getWhisper from "./whisper-addon.cjs";

const CURRENT_DIR = fileURLToPath(new URL(".", import.meta.url));

const mapAppLanguageToWhisperLanguage = (
  languageCode: LanguageCode,
): import("./whisper-addon.cjs").WhisperSupportedLanguage => {
  switch (languageCode) {
    case "ru-RU":
      return "ru";
    case "en-US":
      return "en";
    default:
      throw new Error(`The language code "${languageCode}" is not supported?`);
  }
};

/**
 *
 * Download the model: https://huggingface.co/ggerganov/whisper.cpp
 * Demo UI: https://whisper.ggerganov.com/ggml-model-whisper-tiny.bin
 * Download the NodeJS addon:
 * - Original: https://github.com/ggerganov/whisper.cpp/tree/master/examples/addon.node
 * - Fork: https://github.com/n0th1ng-else/whisper.cpp/tree/master/examples/addon.node
 *
 * @param wavPath {string} - file path
 * @param languageCode {import("../recognition/types").LanguageCode} - language code for recognition
 *
 * @return {Promise<string>}
 */

export const runWhisper = async (
  wavPath: string,
  languageCode: LanguageCode,
): Promise<string> => {
  const modelPath = joinPath(
    CURRENT_DIR,
    "./ggml-model-whisper-small-q5_1.bin",
  );
  const runWhisperAsync = getWhisper();
  const language = mapAppLanguageToWhisperLanguage(languageCode);

  const whisperParams: import("./whisper-addon.cjs").WhisperOptions = {
    language,
    model: modelPath,
    fname_inp: wavPath,
    use_gpu: true,
    flash_attn: false,
    no_prints: true,
    comma_in_time: false,
    translate: false,
    no_timestamps: true,
    audio_ctx: 0,
  };

  const tokens = await runWhisperAsync(whisperParams);

  if (!Array.isArray(tokens)) {
    return "";
  }

  const fullText = tokens
    .map((token) => token.at(-1))
    .filter(Boolean)
    .join("")
    .trim();

  return fullText ?? "";
};
