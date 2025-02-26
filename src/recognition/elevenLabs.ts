import { ElevenLabsClient } from "elevenlabs";
import { Logger } from "../logger/index.js";
import {
  VoiceConverter,
  type ConverterMeta,
  type LanguageCode,
} from "./types.js";
import { addAttachment } from "../monitoring/sentry.js";
import { getWavBuffer } from "../ffmpeg/index.js";
import { convertLanguageCodeToISO } from "./common.js";

const logger = new Logger("11-labs-recognition");

type ElevenLabsProviderOptions = {
  apiToken: string;
};

export class ElevenLabsProvider extends VoiceConverter {
  public static readonly timeout = 10_000;
  private readonly client: ElevenLabsClient;

  constructor(options: ElevenLabsProviderOptions) {
    super();

    logger.info("Using Eleven.labs");
    this.client = new ElevenLabsClient({
      apiKey: options.apiToken,
    });
  }

  public async transformToText(
    fileLink: string,
    lang: LanguageCode,
    logData: ConverterMeta,
  ): Promise<string> {
    const name = `${logData.fileId}.ogg`;
    addAttachment(logData.fileId, fileLink);
    logger.info(`${logData.prefix} Starting process for ${Logger.y(name)}`);
    const rawWav = await getWavBuffer(fileLink);

    logger.info(`${logData.prefix} Start converting ${Logger.y(name)}`);
    return this.recognise(rawWav, lang);
  }

  private async recognise(data: Buffer, lang: LanguageCode): Promise<string> {
    const audioBlob = new Blob([data], {
      type: "audio/wav",
    });
    return await this.client.speechToText
      .convert(
        {
          file: audioBlob,
          model_id: "scribe_v1",
          tag_audio_events: false, // Tag audio events like laughter, applause, etc.
          language_code: convertLanguageCodeToISO(lang),
          diarize: false, // Whether to annotate who is speaking
        },
        {
          abortSignal: AbortSignal.timeout(ElevenLabsProvider.timeout),
        },
      )
      .then((recognition) => recognition.text);
  }
}
