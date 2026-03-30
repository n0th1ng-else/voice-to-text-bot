import { type ConverterMeta, type LanguageCode, VoiceConverter } from "./types.js";
import { addAttachment } from "../monitoring/sentry/index.js";
import { Logger } from "../logger/index.js";
import { getAudioBuffer } from "../ffmpeg/index.js";

const logger = new Logger("api-base-recognition");

export abstract class APIVoiceConverter<Res> extends VoiceConverter {
  protected readonly useRawFile: boolean;
  protected readonly url: string;

  protected constructor(name: string, baseUrl: string, useRawFile: boolean) {
    super(name);
    this.useRawFile = useRawFile;
    this.url = baseUrl;
  }

  public async transformToText(
    fileLink: string,
    fileDuration: number,
    lang: LanguageCode,
    logData: ConverterMeta,
    isLocalFile: boolean,
  ): Promise<string> {
    const name = `${logData.fileId}.ogg`;
    addAttachment(logData.fileId, fileLink);
    logger.info(`${logData.prefix} Starting process for ${Logger.y(name)}`);
    const bufferData = await getAudioBuffer(fileLink, isLocalFile, !this.useRawFile);
    logger.info(`${logData.prefix} Start converting ${Logger.y(name)}`);
    const result = await this.recognise(
      {
        data: bufferData,
        name,
        type: "audio/wav",
        duration: fileDuration,
      },
      lang,
      logData.prefix,
    );
    return result;
  }

  protected abstract recognise(
    file: {
      data: Buffer<ArrayBufferLike>;
      name: string;
      type: "audio/wav";
      duration: number;
    },
    lang: LanguageCode,
    logPrefix: string,
  ): Promise<string>;

  protected abstract isRecognitionResponse(response: unknown): response is Res;
}

export class APIVoiceConverterError extends Error {
  public code = 0;
  public response?: unknown;
  public url = "";

  constructor(cause: unknown, message = "Request was unsuccessful") {
    super(`EAPICONVERTER ${message}`, { cause });
  }

  public setResponseCode(code = 0): this {
    this.code = code;
    return this;
  }

  public setResponse(response?: unknown): this {
    this.response = response;
    return this;
  }

  public setUrl(url: string): this {
    this.url = url;
    return this;
  }
}
