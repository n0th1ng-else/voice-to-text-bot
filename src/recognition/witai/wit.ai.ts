import axios from "axios";
import { Logger } from "../../logger/index.js";
import {
  LanguageCode,
  VoiceConverter,
  VoiceConverterOptions,
} from "../types.js";
import { getWav } from "../../ffmpeg/index.js";
import { parseChunkedResponse } from "../../common/request.js";
import { wavSampleRate } from "../../const.js";
import { WitAiError } from "./wit.ai.error.js";

const logger = new Logger("wit-ai-recognition");

export class WithAiProvider extends VoiceConverter {
  public static readonly url = "https://api.wit.ai";
  public static readonly timeout = 30_000;
  private static readonly apiVersion = "20230215";
  private readonly tokenEn: string;
  private readonly tokenRu: string;

  constructor(options: VoiceConverterOptions) {
    super();

    logger.info("Using Wit.ai");
    this.tokenEn = options.witAiTokenEn || "";
    this.tokenRu = options.witAiTokenRu || "";
  }

  public transformToText(
    fileLink: string,
    fileId: string,
    isVideo: boolean,
    lang: LanguageCode
  ): Promise<string> {
    const name = `${fileId}.ogg`;
    logger.info(`Starting process for ${Logger.y(name)}`);
    return getWav(fileLink, isVideo)
      .then((bufferData) => {
        logger.info(`Start converting ${Logger.y(name)}`);
        const token = lang === LanguageCode.Ru ? this.tokenRu : this.tokenEn;
        return WithAiProvider.recogniseDictation(bufferData, token);
      })
      .then((chunks) => chunks.map(({ text }) => text).join(" ") || "");
  }

  private static recogniseSpeech(
    data: Buffer,
    authToken = ""
  ): Promise<WitAiSpeechResponse[]> {
    return WithAiProvider.runRequest<WitAiSpeechResponse>(
      data,
      "speech",
      authToken
    );
  }

  private static recogniseDictation(
    data: Buffer,
    authToken = ""
  ): Promise<WitAiDictationResponse[]> {
    return WithAiProvider.runRequest<WitAiDictationResponse>(
      data,
      "dictation",
      authToken
    );
  }

  private static runRequest<Dto extends WitAiBaseResponse>(
    data: Buffer,
    path: "speech" | "dictation",
    authToken = ""
  ): Promise<Dto[]> {
    if (!authToken) {
      return Promise.reject(new Error("The auth token is not provided"));
    }

    const url = `${WithAiProvider.url}/${path}`;
    return axios
      .request<string>({
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
        timeout: WithAiProvider.timeout,
        responseType: "text",
        data,
        transformResponse: (d) => d,
      })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error("The api request was unsuccessful");
        }

        return response.data;
      })
      .then((response) => {
        const chunks = parseChunkedResponse<Dto>(response);
        const finalizedChunks = chunks.filter(
          ({ is_final: isFinal }) => isFinal
        );
        if (!finalizedChunks.length) {
          logger.warn(
            "The final response chunk not found. Transcription is empty.",
            chunks.map(({ text }) => text)
          );
        }
        return finalizedChunks;
      })
      .catch((err) => {
        const witAiError = new WitAiError(err.message, err)
          .setUrl(url)
          .setErrorCode(err?.response?.status)
          .setResponse(err?.response?.data);
        throw witAiError;
      });
  }
}

interface WitAiBaseResponse {
  text?: string;
  is_final?: boolean;
}

interface WitAiSpeechResponse extends WitAiBaseResponse {
  entities: Record<string, WitAiEntity>;
  intents: WitAiIntent[];
  traits: Record<string, WitAiIntent>;
}

interface WitAiDictationResponse extends WitAiBaseResponse {}

interface WitAiIntent {
  id: string;
  value: string;
  confidence: number;
}

interface WitAiEntity extends WitAiIntent {
  name: string;
  role: string;
  start: number;
  end: number;
  body: string;
  entities: WitAiEntity[];
  type: string;
}