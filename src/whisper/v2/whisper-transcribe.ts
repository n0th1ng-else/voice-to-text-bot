import waveFile from "wavefile";
import { readFile } from "node:fs/promises";
import { getWhisperInstance, type WhisperModel } from "./whisper-instance.js";
import { mapAppLanguageToWhisperLanguage } from "../utils.js";
import type { LanguageCode } from "../../recognition/types.js";

const getAudioInFloat64Array = async (
  fileUrl: string,
): Promise<Float64Array> => {
  const buffer = await readFile(fileUrl);
  const wav = new waveFile.WaveFile(buffer);
  wav.toBitDepth("32f");
  wav.toSampleRate(16_000);
  let audioData = wav.getSamples();

  if (Array.isArray(audioData)) {
    if (audioData.length > 1) {
      const SCALING_FACTOR = Math.sqrt(2);
      for (let i = 0; i < audioData[0].length; ++i) {
        audioData[0][i] =
          (SCALING_FACTOR * (audioData[0][i] + audioData[1][i])) / 2;
      }
    }

    audioData = audioData[0];
  }

  return audioData;
};

export const runWhisper = async (
  modelName: WhisperModel,
  fileUrl: string,
  languageCode: LanguageCode,
): Promise<string> => {
  console.log("Fetching the converter...");
  const { model, whisper } = await getWhisperInstance(modelName);
  const isDistilWhisper = model.startsWith("distil-whisper/");

  const language = mapAppLanguageToWhisperLanguage(languageCode);
  console.log("Converting to Float32Array...");
  const wavData = await getAudioInFloat64Array(fileUrl);

  console.log("Recognising the voice...");
  const output = await whisper(wavData, {
    top_k: 0,
    do_sample: false,
    chunk_length_s: isDistilWhisper ? 20 : 30,
    stride_length_s: isDistilWhisper ? 3 : 5,
    language,
    task: "transcribe",
    return_timestamps: false,
    force_full_sequences: false,
  });

  const result = Array.isArray(output) ? output.at(0) : output;
  const text = result?.text || "";

  console.log("[done]");
  return text.trim();
};
