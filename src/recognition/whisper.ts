import { arch } from "node:os";
import {
  type ConverterMeta,
  type LanguageCode,
  VoiceConverter,
} from "./types.ts";
import { Logger } from "../logger/index.ts";
import { addAttachment } from "../monitoring/sentry.ts";
import { getWavFilePath } from "../ffmpeg/index.ts";
import { deleteFileIfExists } from "../files/index.ts";
import { runWhisper } from "../whisper/whisper-engine.ts";
import {
  lookupModel,
  type WhisperAddonArchitecture,
} from "../whisper/utils.ts";
import { whisperEnableGpu, whisperModelFile } from "../env.ts";

const logger = new Logger("whisper-recognition");

export class WhisperProvider extends VoiceConverter {
  private modelPath: string | undefined;
  private readonly architecture: WhisperAddonArchitecture;

  private constructor() {
    super();
    this.architecture = arch().includes("x64") ? "x64" : "arm";
    logger.info(`Using [${this.architecture}] Whisper`);
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
      this.architecture,
      whisperEnableGpu,
    );
    await deleteFileIfExists(filePath);
    return text;
  }
}
