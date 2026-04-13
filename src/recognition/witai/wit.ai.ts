import { z } from "zod";
import { Logger } from "../../logger/index.js";
import {
  VoiceConverter,
  type ConverterMeta,
  type LanguageCode,
  type LanguageTokens,
} from "../types.js";
import { getAudioBlob } from "../../ffmpeg/index.js";
import { parseChunkedResponse } from "../../common/request.js";
import { TimeMeasure } from "../../common/timer.js";
import { API_TIMEOUT_MS, wavSampleRate } from "../../const.js";
import { WitAiChunkError, WitAiError } from "./wit.ai.error.js";
import { trackRecognitionTime } from "../../monitoring/newrelic.js";
import { unknownHasMessage } from "../../common/unknown.js";
import { getResponseErrorData } from "../../server/error.js";
import { deleteFileIfExists } from "../../files/index.js";

const logger = new Logger("wit-ai-recognition");

export class WithAiProvider extends VoiceConverter {
  public static readonly url = "https://api.wit.ai";
  private static readonly apiVersion = "20230215";
  private readonly tokens: LanguageTokens;

  constructor(tokens: LanguageTokens) {
    super("Wit.ai");

    this.tokens = tokens;
  }

  public async transformToText(
    fileLink: string,
    fileDuration: number,
    lang: LanguageCode,
    logData: ConverterMeta,
    isLocalFile: boolean,
  ): Promise<string> {
    const name = `${logData.fileId}.ogg`;
    logger.info(`${logData.prefix} Starting process for ${Logger.y(name)}`);
    const [fileBlob, filePath] = await getAudioBlob(fileLink, isLocalFile);
    logger.info(`${logData.prefix} Start converting ${Logger.y(name)}`);
    const token = this.getApiToken(lang);
    if (!token) {
      throw new Error("The token is not provided for the language", {
        cause: { lang },
      });
    }

    try {
      const result = await WithAiProvider.recognise(fileBlob, fileDuration, token, logData.prefix);
      return result;
    } finally {
      await deleteFileIfExists(filePath);
    }
  }

  private static async recognise(
    data: Blob,
    fileDuration: number,
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

        const perSec = trackRecognitionTime("WITAI", timeTotalMs, fileDuration);
        logger.info(
          `${logPrefix} Voice recognition api took ${timeTotalMs}ms to finish. Recognition speed: ${perSec}ms per sec`,
        );
      });
  }

  private static async recogniseSpeech(data: Blob, authToken: string): Promise<WitAiResponse[]> {
    return await WithAiProvider.runRequest(data, "speech", WitAiResponseSchema, authToken);
  }

  private static async recogniseDictation(data: Blob, authToken: string): Promise<WitAiResponse[]> {
    return await WithAiProvider.runRequest(data, "dictation", WitAiResponseSchema, authToken);
  }

  private static async runRequest<Output, Input = Output>(
    data: Blob,
    path: "speech" | "dictation",
    schema: z.ZodType<Output, Input>,
    authToken: string,
  ): Promise<z.infer<z.ZodType<Output, Input>>[]> {
    if (!authToken) {
      throw new Error("The auth token is not provided");
    }

    const url = new URL(`${WithAiProvider.url}/${path}`);
    url.searchParams.set("v", WithAiProvider.apiVersion);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "application/json",
          "Content-Type": `audio/raw;encoding=signed-integer;bits=16;rate=${wavSampleRate};endian=little`,
        },
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        body: data,
      });

      if (!response.ok) {
        const errResp = await getResponseErrorData(response);
        const err = new Error("The api request was unsuccessful");
        const witAiError = new WitAiError(err, err.message)
          .setUrl(`${url}`)
          .setErrorCode(response.status)
          .setBufferLength(data)
          .setResponse(errResp);

        throw witAiError;
      }

      const text = await response.text();
      const arraySchema = z.array(schema);
      const chunks = arraySchema.parse(parseChunkedResponse(text));
      return chunks;
    } catch (err) {
      const wrappedErr =
        err instanceof WitAiError
          ? err
          : new WitAiError(err, unknownHasMessage(err) ? err.message : undefined)
              .setUrl(`${url}`)
              .setBufferLength(data);
      throw wrappedErr;
    }
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
