import type { LanguageCode } from "../recognition/types.js";
import { type WhisperAddonArchitecture } from "./utils.js";
import { type WhisperOptions, default as getWhisper } from "./whisper-addon.cjs";
import { convertLanguageCodeToISO } from "../recognition/common.js";

/**
 *
 * Download the model: https://huggingface.co/ggerganov/whisper.cpp
 * Demo UI: https://whisper.ggerganov.com/ggml-model-whisper-tiny.bin
 * Download the NodeJS addon:
 * - Original: https://github.com/ggerganov/whisper.cpp/tree/master/examples/addon.node
 * - Fork: https://github.com/n0th1ng-else/whisper.cpp/tree/master/examples/addon.node
 *
 * @param modelPath {string} - Whisper model file
 * @param wavPath {string} - file path
 * @param languageCode {import("../recognition/types").LanguageCode} - language code for recognition
 * @param architecture {import("./utils.js").WhisperAddonArchitecture}
 * @param useGpu {boolean}
 *
 * @return {Promise<string>}
 */
export const runWhisper = async (
  modelPath: string,
  wavPath: string,
  languageCode: LanguageCode,
  architecture: WhisperAddonArchitecture,
  useGpu: boolean,
): Promise<string> => {
  const runWhisperAsync = getWhisper(architecture);
  const language = convertLanguageCodeToISO(languageCode);

  const whisperParams: WhisperOptions = {
    language,
    model: modelPath,
    fname_inp: wavPath,
    use_gpu: useGpu,
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
