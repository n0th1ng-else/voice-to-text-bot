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
    fileId: number,
    lang: LanguageCode
  ): Promise<string> {
    const name = `${fileId}.wav`;
    logger.info("Starting process for", fileLink);
    return this.getFileBase64(fileLink)
      .then((bufferData) => {
        logger.info("Start converting", name, fileLink);
        return this.service.recognize({
          audio: {
            content: bufferData.plainBuffer,
          },
          config: {
            encoding: "OGG_OPUS",
            sampleRateHertz: bufferData.sampleRate,
            audioChannelCount: bufferData.numberOfChannels,
            model: "phone_call",
            useEnhanced: true,
            languageCode: lang,
          },
        });
      })
      .then((translationData: any) => this.unpackTranscription(translationData))
      .then((text) => {
        logger.info(`Job ${name} completed`);
        return text;
      });
  }

  unpackTranscription(translationData: any): Promise<string> {
    const transcription = translationData[0].results
      .map((result: any) => result.alternatives[0].transcript)
      .join("\n");
    return Promise.resolve(transcription);
  }

  private getFileBase64(fileLink: string): Promise<AudioFileData> {
    logger.info("Converting into base64 💿");
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
