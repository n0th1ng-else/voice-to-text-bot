import { pipeline, env } from "@xenova/transformers";

let whisper = null;

env.allowLocalModels = false;

const MODEL = "Xenova/whisper-small";

export const getWhisperInstance = async () => {
  if (whisper) {
    return whisper;
  }

  const instance = await pipeline("automatic-speech-recognition", MODEL, {
    quantized: false,
    // local_files_only: true,
    // cache_dir: './.cache',
    progress_callback: (data) => {
      console.log(data);
    },
    // For medium models, we need to load the `no_attentions` revision to avoid running out of memory
    revision: MODEL.includes("/whisper-medium") ? "no_attentions" : "main",
  });

  whisper = {
    whisper: instance,
    model: MODEL,
  };

  return whisper;
};
