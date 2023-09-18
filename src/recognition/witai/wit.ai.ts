import { Logger } from "../../logger/index.js";
import {
  ConverterMeta,
  LanguageCode,
  VoiceConverter,
  VoiceConverterOptions,
} from "../types.js";
import { getWav } from "../../ffmpeg/index.js";
import {
  parseChunkedResponse,
  runRequestWithTimeout,
} from "../../common/request.js";
import { TimeMeasure } from "../../common/timer.js";
import { wavSampleRate } from "../../const.js";
import { WitAiChunkError, WitAiError } from "./wit.ai.error.js";

const logger = new Logger("wit-ai-recognition");

export class WithAiProvider extends VoiceConverter {
  public static readonly url = "https://api.wit.ai";
  public static readonly timeout = 10_000;
  private static readonly apiVersion = "20230215";
  private readonly tokenEn: string;
  private readonly tokenRu: string;

  constructor(options: VoiceConverterOptions) {
    super();

    logger.info("Using Wit.ai");
    this.tokenEn = options.witAiTokenEn ?? "";
    this.tokenRu = options.witAiTokenRu ?? "";
  }

  public transformToText(
    fileLink: string,
    isVideo: boolean,
    lang: LanguageCode,
    logData: ConverterMeta,
  ): Promise<string> {
    const name = `${logData.fileId}.ogg`;
    logger.info(`${logData.prefix} Starting process for ${Logger.y(name)}`);
    return getWav(fileLink, isVideo)
      .then((bufferData) => {
        logger.info(`${logData.prefix} Start converting ${Logger.y(name)}`);
        const token = this.getApiToken(lang);
        return WithAiProvider.recognise(bufferData, token, logData.prefix);
      })
      .then((chunks) => chunks.map(({ text }) => text).join(" ") || "");
  }

  private static recognise(
    data: Buffer,
    authToken: string,
    logPrefix: string,
  ): Promise<WitAiDictationResponse[]> {
    const duration = new TimeMeasure();
    return WithAiProvider.recogniseDictation(data, authToken, logPrefix)
      .catch((err) => {
        logger.error(
          `${logPrefix} Unable to resolve the dictation api. Retrying with speech api`,
          err,
        );
        return WithAiProvider.recogniseSpeech(data, authToken, logPrefix);
      })
      .finally(() => {
        logger.info(
          `${logPrefix} Voice recognition api took ${duration.getMs()}ms to finish`,
        );
      });
  }

  private static recogniseSpeech(
    data: Buffer,
    authToken: string,
    logPrefix: string,
  ): Promise<WitAiSpeechResponse[]> {
    return WithAiProvider.runRequest<WitAiSpeechResponse>(
      data,
      "speech",
      authToken,
      logPrefix,
    );
  }

  private static recogniseDictation(
    data: Buffer,
    authToken: string,
    logPrefix: string,
  ): Promise<WitAiDictationResponse[]> {
    return WithAiProvider.runRequest<WitAiDictationResponse>(
      data,
      "dictation",
      authToken,
      logPrefix,
    );
  }

  private static runRequest<Dto extends WitAiDictationResponse>(
    data: Buffer,
    path: "speech" | "dictation",
    authToken: string,
    logPrefix: string,
  ): Promise<Dto[]> {
    if (!authToken) {
      return Promise.reject(new Error("The auth token is not provided"));
    }

    const url = `${WithAiProvider.url}/${path}`;
    return runRequestWithTimeout<string>(
      {
        method: "POST",
        url,
        params: {
          v: WithAiProvider.apiVersion,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "application/json",
          "Content-Type": `audio/raw;encoding=signed-integer;bits=16;rate=${wavSampleRate};endian=little`,
          "Transfer-Encoding": "chunked",
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        responseType: "text",
        data,
        transformResponse: (d: string) => d,
      },
      WithAiProvider.timeout,
    )
      .then((response) => {
        const chunks = parseChunkedResponse<Dto>(response);
        const errorChunk = chunks.find((chunk) => chunk.error);
        if (errorChunk) {
          logger.error(
            `${logPrefix} Recognition api returned error`,
            new WitAiChunkError(errorChunk)
              .setErrorCode(errorChunk.code)
              .setResponse(errorChunk.error),
          );
        }
        const finalizedChunks = chunks.filter((chunk) => chunk.is_final);
        if (!finalizedChunks.length) {
          logger.warn(
            `${logPrefix} The final response chunk not found. Transcription is empty.`,
            chunks.map(({ text }) => text),
          );
        }
        return finalizedChunks;
      })
      .catch((err) => {
        const witAiError = new WitAiError(err, err.message)
          .setUrl(url)
          .setErrorCode(err?.response?.status)
          .setResponse(err?.response?.data)
          .setBufferLength(data);
        throw witAiError;
      });
  }

  private getApiToken(lang: LanguageCode): string {
    switch (lang) {
      case "ru-RU":
        return this.tokenRu;
      default:
        return this.tokenEn;
    }
  }
}

export type WitAiDictationResponse = {
  text?: string;
  is_final?: boolean;
  code?: string;
  error?: string;
};

type WitAiSpeechResponse = {
  entities: Record<string, WitAiEntity>;
  intents: WitAiIntent[];
  traits: Record<string, WitAiIntent>;
} & WitAiDictationResponse;

type WitAiIntent = {
  id: string;
  value: string;
  confidence: number;
};

type WitAiEntity = {
  name: string;
  role: string;
  start: number;
  end: number;
  body: string;
  entities: WitAiEntity[];
  type: string;
} & WitAiIntent;
