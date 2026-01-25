import { z } from "zod";
import axios from "axios";
import { Logger } from "../../logger/index.js";
import {
  VoiceConverter,
  type ConverterMeta,
  type LanguageCode,
  type LanguageTokens,
} from "../types.js";
import { getWavBuffer } from "../../ffmpeg/index.js";
import { parseChunkedResponse } from "../../common/request.js";
import { TimeMeasure } from "../../common/timer.js";
import { API_TIMEOUT_MS, wavSampleRate } from "../../const.js";
import { WitAiChunkError, WitAiError } from "./wit.ai.error.js";
import { addAttachment } from "../../monitoring/sentry/index.js";
import { trackRecognitionTime } from "../../monitoring/newrelic.js";

const logger = new Logger("wit-ai-recognition");

export class WithAiProvider extends VoiceConverter {
  protected readonly name = "Wit.ai";
  public static readonly url = "https://api.wit.ai";
  private static readonly apiVersion = "20230215";
  private readonly tokens: LanguageTokens;

  constructor(tokens: LanguageTokens) {
    super("Wit.ai");

    this.tokens = tokens;
  }

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
    const token = this.getApiToken(lang);
    if (!token) {
      throw new Error("The token is not provided for the language", {
        cause: { lang },
      });
    }
    const result = await WithAiProvider.recognise(bufferData, token, logData.prefix);
    return result;
  }

  private static async recognise(
    data: Buffer<ArrayBufferLike>,
    authToken: string,
    logPrefix: string,
  ): Promise<string> {
    const duration = new TimeMeasure();
    return WithAiProvider.recogniseDictation(data, authToken)
      .catch((err) => {
        logger.error(
          `${logPrefix} Unable to resolve the dictation api. Retrying with speech api`,
          err,
        );
        return WithAiProvider.recogniseSpeech(data, authToken);
      })
      .then((chunks) => {
        const errorChunk = chunks.find((chunk) => chunk.error);
        if (errorChunk) {
          const witAiError = new WitAiChunkError(errorChunk, errorChunk.error).setId(
            errorChunk.code,
          );
          throw witAiError;
        }
        const finalizedChunks = chunks.filter((chunk) => chunk.is_final);
        if (!finalizedChunks.length) {
          logger.warn(`${logPrefix} The final response chunk not found. Transcription is empty.`, {
            text: chunks.map((chunk) => chunk.text || "").join(" ") || "",
          });
        }
        return finalizedChunks.map(({ text }) => text || "").join(" ") || "";
      })
      .finally(() => {
        const timeTotalMs = duration.getMs();
        const timeLimit = 2 * API_TIMEOUT_MS + 1_000;
        if (timeTotalMs > timeLimit) {
          logger.error(
            `${logPrefix} Voice recognition api took ${timeTotalMs}ms to finish`,
            new Error("Voice recognition api took too long", {
              cause: { durationMs: timeTotalMs },
            }),
          );
          return;
        }
        logger.info(`${logPrefix} Voice recognition api took ${timeTotalMs}ms to finish`);
        trackRecognitionTime("WITAI", timeTotalMs);
      });
  }

  private static async recogniseSpeech(
    data: Buffer<ArrayBufferLike>,
    authToken: string,
  ): Promise<WitAiResponse[]> {
    return await WithAiProvider.runRequest(data, "speech", WitAiResponseSchema, authToken);
  }

  private static async recogniseDictation(
    data: Buffer<ArrayBufferLike>,
    authToken: string,
  ): Promise<WitAiResponse[]> {
    return await WithAiProvider.runRequest(data, "dictation", WitAiResponseSchema, authToken);
  }

  private static async runRequest<Output, Input = Output>(
    data: Buffer<ArrayBufferLike>,
    path: "speech" | "dictation",
    schema: z.ZodType<Output, Input>,
    authToken: string,
  ): Promise<z.infer<z.ZodType<Output, Input>>[]> {
    if (!authToken) {
      throw new Error("The auth token is not provided");
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
        timeout: API_TIMEOUT_MS,
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        responseType: "text",
        data,
        transformResponse: (d: string) => d,
      })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error("The api request was unsuccessful");
        }

        return response.data;
      })
      .catch((err) => {
        const attachedError = axios.isAxiosError(err) ? err.toJSON() : err;
        delete attachedError?.config;

        const witAiError = new WitAiError(attachedError, attachedError.message)
          .setUrl(url)
          .setErrorCode(attachedError?.status)
          .setBufferLength(data);

        throw witAiError;
      })
      .then((response) => {
        const arraySchema = z.array(schema);
        const chunks = arraySchema.parse(parseChunkedResponse(response));
        return chunks;
      });
  }

  private getApiToken(lang: LanguageCode): string | undefined {
    return this.tokens[lang];
  }
}

const WitAiResponseSchema = z.object({
  text: z.optional(z.string()),
  is_final: z.optional(z.boolean()),
  code: z.optional(z.string()),
  error: z.optional(z.string()),
});

type WitAiResponse = z.infer<typeof WitAiResponseSchema>;
