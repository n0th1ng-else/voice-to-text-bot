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
import { runGetBuffer } from "../server/request";

const logger = new Logger("google-recognition");

const supportedSampleRates = [8000, 12000, 16000, 24000, 48000];

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

  public transformToText(
    fileLink: string,
    fileId: string,
    lang: LanguageCode
  ): Promise<string> {
    const name = `${fileId}.ogg`;
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
            sampleRateHertz: this.getSampleRate(bufferData.sampleRate),
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

  private unpackTranscription(
    translationData: IRecognizeResponse
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

  private getFileBase64(fileLink: string): Promise<AudioFileData> {
    logger.info("Converting file url into base64 💿");
    return runGetBuffer(fileLink).then((buffer) =>
      parseBuffer(buffer).then((info) => new AudioFileData(buffer, info))
    );
  }

  private getSampleRate(fileSampleRate?: number): number {
    if (!fileSampleRate) {
      logger.warn(
        `No sample rate detected. falling back to ${supportedSampleRates[2]}`
      );
      return supportedSampleRates[2];
    }

    if (supportedSampleRates.includes(fileSampleRate)) {
      return fileSampleRate;
    }

    const closest = supportedSampleRates.reduce(
      (prev, curr) =>
        Math.abs(curr - fileSampleRate) < Math.abs(prev - fileSampleRate)
          ? curr
          : prev,
      supportedSampleRates[2]
    );

    logger.warn(
      `Sample rate ${fileSampleRate} is not supported. Trying the closest one ${closest}`
    );
    return closest;
  }
}
