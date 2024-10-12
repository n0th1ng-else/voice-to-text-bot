export type TranscriberInput = {
  fileUrl: string;
  language: import("../../whisper/whisper-addon.cjs").WhisperSupportedLanguage;
};

export type TranscriberOutput = {
  text: string;
};

export type Transcriber = (
  params: TranscriberInput,
) => Promise<TranscriberOutput>;

export type WhisperModel = "regular" | "turbo";
