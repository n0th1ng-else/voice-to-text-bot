import { v1 } from "@google-cloud/speech";
import type { google } from "@google-cloud/speech/build/protos/protos.js";
import {
  type ConverterMeta,
  type LanguageCode,
  VoiceConverter,
} from "./types.js";
import { Logger } from "../logger/index.js";
import { getWavBuffer } from "../ffmpeg/index.js";

const logger = new Logger("google-recognition");

type GoogleVoiceProviderOptions = {
  isTestEnv?: boolean;
  googleProjectId?: string;
  googleClientEmail?: string;
  googlePrivateKey?: string;
};

export class GoogleProvider extends VoiceConverter {
  private readonly service: v1.SpeechClient;

  constructor(options: GoogleVoiceProviderOptions) {
    super();

    logger.info("Using Google");

    this.service = new v1.SpeechClient({
      fallback: options.isTestEnv,
      projectId: options.googleProjectId,
      credentials: {
        private_key: options.googlePrivateKey,
        client_email: options.googleClientEmail,
      },
    });
  }

  public transformToText(
    fileLink: string,
    _isVideo: boolean,
    lang: LanguageCode,
    opts: ConverterMeta,
  ): Promise<string> {
    const name = `${opts.fileId}.ogg`;
    logger.info(`Starting process for ${Logger.y(name)}`);
    return getWavBuffer(fileLink)
      .then((bufferData) => {
        logger.info(`Start converting ${Logger.y(name)}`);
        return this.service.recognize({
          audio: {
            content: bufferData.toString("base64"),
          },
          config: {
            enableAutomaticPunctuation: true,
            model: "phone_call",
            useEnhanced: true,
            languageCode: lang,
          },
        });
      })
      .then(([translationData]) => this.unpackTranscription(translationData))
      .then((text) => {
        logger.info(`Job ${Logger.y(name)} completed`);
        return text;
      });
  }

  private unpackTranscription(
    translationData: google.cloud.speech.v1.IRecognizeResponse,
  ): Promise<string> {
    const res = translationData.results || [];
    const transcription = res
      .map((result) => {
        const options = result.alternatives || [{ transcript: "" }];
        return options[0].transcript;
      })
      .filter((text) => text)
      .join("\n");
    return Promise.resolve(transcription);
  }
}
