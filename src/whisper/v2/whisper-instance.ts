import {
  pipeline,
  env,
  type AutomaticSpeechRecognitionPipeline,
} from "@xenova/transformers";

const WHISPER_MODEL = [
  "Xenova/whisper-small",
  "Xenova/whisper-medium",
] as const;

export type WhisperModel = (typeof WHISPER_MODEL)[number];

export const isWhisperModel = (model: string): model is WhisperModel => {
  return WHISPER_MODEL.some((version) => version === model);
};

type WhisperInstance = {
  whisper: AutomaticSpeechRecognitionPipeline;
  model: WhisperModel;
};

let whisper: WhisperInstance | null = null;

env.allowLocalModels = false;

export const getWhisperInstance = async (
  model: WhisperModel,
): Promise<WhisperInstance> => {
  if (whisper) {
    return whisper;
  }

  const instance = await pipeline("automatic-speech-recognition", model, {
    quantized: false,
    // local_files_only: true,
    // cache_dir: './.cache',
    progress_callback: console.log,
    // For medium models, we need to load the `no_attentions` revision to avoid running out of memory
    revision: model.includes("/whisper-medium") ? "no_attentions" : "main",
  });

  whisper = {
    whisper: instance,
    model,
  };

  return whisper;
};
