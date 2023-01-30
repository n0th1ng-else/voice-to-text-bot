import { v1 } from "@google-cloud/speech";
import {
  LanguageCode,
  VoiceConverter,
  VoiceConverterOptions,
} from "./types.js";
import { Logger } from "../logger/index.js";
import { google } from "@google-cloud/speech/build/protos/protos.js";
import { getWav } from "../ffmpeg/index.js";

const logger = new Logger("google-recognition");

export class GoogleProvider extends VoiceConverter {
  private readonly service: v1.SpeechClient;

  constructor(options: VoiceConverterOptions) {
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
    fileId: string,
    isVideo: boolean,
    lang: LanguageCode
  ): Promise<string> {
    const name = `${fileId}.ogg`;
    logger.info(`Starting process for ${Logger.y(name)}`);
    return getWav(fileLink, isVideo)
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
    translationData: google.cloud.speech.v1.IRecognizeResponse
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
