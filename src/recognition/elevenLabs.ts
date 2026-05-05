import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Logger } from "../logger/index.js";
import { VoiceConverter, type ConverterMeta, type LanguageCode } from "./types.js";
import { getAudioBlob } from "../ffmpeg/index.js";
import { convertLanguageCodeToISO } from "./common.js";
import { API_TIMEOUT_MS } from "../const.js";
import { TimeMeasure } from "../common/timer.js";
import { trackRecognitionTime } from "../monitoring/newrelic.js";
import { deleteFileIfExists } from "../files/index.js";

const logger = new Logger("11-labs-recognition");

type ElevenLabsProviderOptions = {
  apiToken: string;
};

export class ElevenLabsProvider extends VoiceConverter {
  private readonly client: ElevenLabsClient;

  constructor(options: ElevenLabsProviderOptions) {
    super("Eleven.labs");

    this.client = new ElevenLabsClient({
      apiKey: options.apiToken,
    });
  }

  public async transformToText(
    fileLink: string,
    fileDuration: number,
    lang: LanguageCode,
    logData: ConverterMeta,
    isLocalFile: boolean,
  ): Promise<string> {
    const name = `${logData.fileId}.ogg`;
    logger.info(`${logData.prefix} Starting process for ${Logger.y(name)}`);
    const file = await getAudioBlob(fileLink, isLocalFile);
    let fileBlob: null | Blob = file.fileBlob;
    let filePath: null | string = file.filePath;
    logger.info(`${logData.prefix} Start converting ${Logger.y(name)}`);
    try {
      const text = await this.recognise(fileBlob, fileDuration, lang);
      return text;
    } finally {
      await deleteFileIfExists(filePath);
      // eslint-disable-next-line no-useless-assignment
      fileBlob = null;
      // eslint-disable-next-line no-useless-assignment
      filePath = null;
    }
  }

  private async recognise(buffer: Blob, fileDuration: number, lang: LanguageCode): Promise<string> {
    const duration = new TimeMeasure();

    const recognition = await this.client.speechToText.convert(
      {
        file: buffer,
        modelId: "scribe_v1",
        tagAudioEvents: false, // Tag audio events like laughter, applause, etc.
        languageCode: convertLanguageCodeToISO(lang),
        diarize: false, // Whether to annotate who is speaking
      },
      {
        abortSignal: AbortSignal.timeout(API_TIMEOUT_MS),
      },
    );

    trackRecognitionTime("11LABS", duration.getMs(), fileDuration);
    if ("text" in recognition) {
      return recognition.text;
    }
    throw new Error("Wrong response payload");
  }
}
