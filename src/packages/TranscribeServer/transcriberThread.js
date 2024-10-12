import waveFile from "wavefile";
import { readFile } from "node:fs/promises";
import { getWhisperInstance } from "./whisper.js";

const getAudioInFloat32Array = async () => {
  const buffer = await readFile(new URL("./test.wav", import.meta.url));
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

const runTurbo = async (fileUrl, languageCode) => {
  console.log("Fetching the converter...");
  const { model, whisper } = await getWhisperInstance();
  const isDistilWhisper = model.startsWith("distil-whisper/");

  console.log("Converting to Float32Array...");
  const wavData = await getAudioInFloat32Array(fileUrl);

  console.log("Recognising the voice...");
  const output = await whisper(wavData, {
    top_k: 0,
    do_sample: false,
    chunk_length_s: isDistilWhisper ? 20 : 30,
    stride_length_s: isDistilWhisper ? 3 : 5,
    language: languageCode,
    task: "transcribe",
    return_timestamps: false,
    force_full_sequences: false,
  });

  const result = Array.isArray(output) ? output.at(0) : output;
  const text = result?.text || "";

  console.log("[done]");
  return text.trim();
};

export const convertVoiceToText = async ({ fileUrl, language }) => {
  console.log("Start processing...");
  const text = await runTurbo(
    new URL("./test.wav", import.meta.url) || fileUrl, // TODO
    language,
  );

  return {
    text,
  };
};
