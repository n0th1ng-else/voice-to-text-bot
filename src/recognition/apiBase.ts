import { type ConverterMeta, type LanguageCode, VoiceConverter } from "./types.js";
import { addAttachment } from "../monitoring/sentry/index.js";
import { Logger } from "../logger/index.js";
import { getWavBuffer } from "../ffmpeg/index.js";

const logger = new Logger("api-base-recognition");

export abstract class APIVoiceConverter<Res> extends VoiceConverter {
  public async transformToText(
    fileLink: string,
    lang: LanguageCode,
    logData: ConverterMeta,
    isLocalFile: boolean,
  ): Promise<string> {
    const name = `${logData.fileId}.ogg`;
    addAttachment(logData.fileId, fileLink);
    logger.info(`${logData.prefix} Starting process for ${Logger.y(name)}`);
    const bufferData = await getWavBuffer(fileLink, isLocalFile);
    logger.info(`${logData.prefix} Start converting ${Logger.y(name)}`);
    const result = await this.recognise(
      {
        data: bufferData,
        name,
        type: "audio/wav",
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
