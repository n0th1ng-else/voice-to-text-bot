import { type WhisperSupportedLanguage } from "../../whisper/utils.js";

export type TranscriberInput = {
  fileUrl: string;
  language: WhisperSupportedLanguage;
};

export type TranscriberOutput = {
  text: string;
};

export type Transcriber = (
  params: TranscriberInput,
) => Promise<TranscriberOutput>;

export type WhisperModel = "regular" | "turbo";
