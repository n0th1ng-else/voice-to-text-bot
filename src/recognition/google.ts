import { v1 } from "@google-cloud/speech";
import type { google } from "@google-cloud/speech/build/protos/protos.js";
import { type ConverterMeta, type LanguageCode, VoiceConverter } from "./types.js";
import { Logger } from "../logger/index.js";
import { getAudioBlob } from "../ffmpeg/index.js";
import { TimeMeasure } from "../common/timer.js";
import { trackRecognitionTime } from "../monitoring/newrelic.js";
import { deleteFileIfExists } from "../files/index.js";

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
    super("Google");

    this.service = new v1.SpeechClient({
      fallback: options.isTestEnv,
      projectId: options.googleProjectId,
      credentials: {
        private_key: options.googlePrivateKey,
        client_email: options.googleClientEmail,
      },
    });
  }

  public async transformToText(
    fileLink: string,
    fileDuration: number,
    lang: LanguageCode,
    opts: ConverterMeta,
    isLocalFile: boolean,
  ): Promise<string> {
    const name = `${opts.fileId}.ogg`;
    logger.info(`Starting process for ${Logger.y(name)}`);
    const duration = new TimeMeasure();

    const file = await getAudioBlob(fileLink, isLocalFile);
    let fileBlob: null | Blob = file.fileBlob;
    let filePath: null | string = file.filePath;
    logger.info(`Start converting ${Logger.y(name)}`);

    try {
      const arrayBuffer = await fileBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileStr = buffer.toString("base64");

      const [translationData] = await this.service.recognize({
        audio: {
          content: fileStr,
        },
        config: {
          enableAutomaticPunctuation: true,
          model: "phone_call",
          useEnhanced: true,
          languageCode: lang,
        },
      });

      const text = await this.unpackTranscription(translationData);
      logger.info(`Job ${Logger.y(name)} completed`);
      trackRecognitionTime("GOOGLE", duration.getMs(), fileDuration);
      return text;
    } finally {
      await deleteFileIfExists(filePath);
      // eslint-disable-next-line no-useless-assignment
      fileBlob = null;
      // eslint-disable-next-line no-useless-assignment
      filePath = null;
    }
  }

  private async unpackTranscription(
    translationData: google.cloud.speech.v1.IRecognizeResponse,
  ): Promise<string> {
    const res = translationData.results || [];
    const transcription = res
      .map((result) => {
        const options = result.alternatives || [{ transcript: "" }];
        return options[0].transcript;
      })
      .filter(Boolean)
      .join("\n");
    return transcription;
  }
}
