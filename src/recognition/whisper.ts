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
import { lookupModel } from "../whisper/utils.js";
import { whisperEnableGpu, whisperModelFile } from "../env.js";

const logger = new Logger("whisper-recognition");

export class WhisperProvider extends VoiceConverter {
  private modelPath: string | undefined;

  private constructor() {
    super();
    logger.info("Using Whisper");
  }

  private async init(): Promise<void> {
    this.modelPath = await lookupModel(whisperModelFile);
    const modelName = this.modelPath.split("/").at(-1) || "";
    logger.info(`Initialized Whisper with the model ${Logger.y(modelName)}`);
  }

  public static async factory(): Promise<VoiceConverter> {
    const instance = new WhisperProvider();
    await instance.init();
    return instance;
  }

  public async transformToText(
    fileLink: string,
    _isVideo: boolean,
    lang: LanguageCode,
    logData: ConverterMeta,
  ): Promise<string> {
    if (!this.modelPath) {
      throw new Error("Whisper converter is not initialized");
    }

    const name = logData.fileId;
    addAttachment(name, fileLink);
    logger.info(`${logData.prefix} Starting process for ${Logger.y(name)}`);

    const filePath = await getWavFilePath(fileLink);
    logger.info(`${logData.prefix} Start converting ${Logger.y(name)}`);
    const text = await runWhisper(
      this.modelPath,
      filePath,
      lang,
      whisperEnableGpu,
    );
    await deleteFileIfExists(filePath);
    return text;
  }
}