import {
  type ConverterMeta,
  type LanguageCode,
  VoiceConverter,
} from "./types.js";
import { Logger } from "../logger/index.js";
import { addAttachment } from "../monitoring/sentry.js";
import { getWavFilePath } from "../ffmpeg/index.js";
import { deleteFileIfExists } from "../files/index.js";
import { lookupModel } from "../whisper/utils.js";
import { whisperEnableGpu, whisperModelFile } from "../env.js";
import { runWhisper as runV1 } from "../whisper/v1/whisper-engine.js";
import { runWhisper as runV2 } from "../whisper/v2/whisper-transcribe.js";
import {
  getWhisperInstance,
  isWhisperModel,
} from "../whisper/v2/whisper-instance.js";

const logger = new Logger("whisper-recognition");

export class WhisperProvider extends VoiceConverter {
  private modelPath: string | undefined;

  private constructor(private readonly version: "v1" | "v2") {
    super();
    logger.info("Using Whisper");
  }

  private async init(): Promise<void> {
    if (this.version === "v1") {
      this.modelPath = await lookupModel(whisperModelFile);
      const modelName = this.modelPath.split("/").at(-1) || "";
      logger.info(`Initialized Whisper with the model ${Logger.y(modelName)}`);
    }
    if (this.version === "v2") {
      this.modelPath = "Xenova/whisper-medium";
      if (isWhisperModel(this.modelPath)) {
        const modelName = this.modelPath;
        await getWhisperInstance(modelName);
        logger.info(
          `Initialized Whisper with the model ${Logger.y(modelName)}`,
        );
      } else {
        const err = new Error("Unknown Whisper model initialized", {
          cause: {
            modelName: this.modelPath,
          },
        });
        logger.error(err.message, err);
        throw err;
      }
    }
  }

  public static async factory(version: "v1" | "v2"): Promise<WhisperProvider> {
    const instance = new WhisperProvider(version);
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

    let text = "";
    if (this.version === "v1") {
      text = await runV1(this.modelPath, filePath, lang, whisperEnableGpu);
    }

    if (this.version === "v2") {
      if (isWhisperModel(this.modelPath)) {
        text = await runV2(this.modelPath, filePath, lang);
      } else {
        const err = new Error("Unknown Whisper model used", {
          cause: {
            modelName: this.modelPath,
          },
        });
        logger.error(err.message, err);
        throw err;
      }
    }

    await deleteFileIfExists(filePath);
    return text;
  }
}
