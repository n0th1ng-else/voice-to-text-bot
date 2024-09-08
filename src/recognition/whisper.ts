import {
  type ConverterMeta,
  type LanguageCode,
  VoiceConverter,
} from "./types.js";
import { Logger } from "../logger/index.js";
import { addAttachment } from "../monitoring/sentry.js";
import { getWavFilePath } from "../ffmpeg/index.js";
import { deleteFileIfExists } from "../files/index.js";
import { runWhisper } from "../whisper/whisper-engine.js";

const logger = new Logger("whisper-recognition");

export class WhisperProvider extends VoiceConverter {
  constructor() {
    super();
    logger.info("Using Whisper");
  }

  public async transformToText(
    fileLink: string,
    _isVideo: boolean,
    lang: LanguageCode,
    logData: ConverterMeta,
  ): Promise<string> {
    const name = logData.fileId;
    addAttachment(name, fileLink);
    logger.info(`${logData.prefix} Starting process for ${Logger.y(name)}`);

    const filePath = await getWavFilePath(fileLink);
    logger.info(`${logData.prefix} Start converting ${Logger.y(name)}`);
    const text = await runWhisper(filePath, lang);
    await deleteFileIfExists(filePath);
    return text;
  }
}
