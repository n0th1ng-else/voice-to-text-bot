import { get as runGet } from "https";
import { v1 } from "@google-cloud/speech";
import {
  AudioFileData,
  LanguageCode,
  VoiceConverter,
  VoiceConverterOptions,
} from "./types";
import { Logger } from "../logger";
import { parseBuffer } from "music-metadata";
import { google } from "@google-cloud/speech/build/protos/protos";
import IRecognizeResponse = google.cloud.speech.v1.IRecognizeResponse;

const logger = new Logger("Google recognition");

export class GoogleProvider extends VoiceConverter {
  private readonly service: v1.SpeechClient;

  constructor(options: VoiceConverterOptions) {
    super();
    logger.info("Using Google");

    this.service = new v1.SpeechClient({
      projectId: options.googleProjectId,
      credentials: {
        private_key: options.googlePrivateKey,
        client_email: options.googleClientEmail,
      },
    });
  }

  transformToText(
    fileLink: string,
    fileId: string,
    lang: LanguageCode
  ): Promise<string> {
    const name = `${fileId}.wav`;
    logger.info(`Starting process for ${logger.y(name)}`);
    return this.getFileBase64(fileLink)
      .then((bufferData) => {
        logger.info(`Start converting ${logger.y(name)}`);
        return this.service.recognize({
          audio: {
            content: bufferData.plainBuffer,
          },
          config: {
            encoding: "OGG_OPUS",
            sampleRateHertz: bufferData.sampleRate,
            audioChannelCount: bufferData.numberOfChannels,
            enableAutomaticPunctuation: true,
            model: "phone_call",
            useEnhanced: true,
            languageCode: lang,
          },
        });
      })
      .then(([translationData]) => this.unpackTranscription(translationData))
      .then((text) => {
        logger.info(`Job ${logger.y(name)} completed`);
        return text;
      });
  }

  unpackTranscription(translationData: IRecognizeResponse): Promise<string> {
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

  private getFileBase64(fileLink: string): Promise<AudioFileData> {
    logger.info("Converting file url into base64 💿");
    return new Promise<Buffer>((resolve, reject) => {
      runGet(fileLink, (response) => {
        const oggBuffer: Buffer[] = [];
        response.on("data", (chunk) => oggBuffer.push(chunk));
        response.on("error", (err) => reject(err));
        response.on("end", () => resolve(Buffer.concat(oggBuffer)));
      });
    }).then((buffer) =>
      parseBuffer(buffer).then((info) => new AudioFileData(buffer, info))
    );
  }
}
