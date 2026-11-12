import { nanoid } from "nanoid";
import type { LanguageCode } from "./types.js";
import { APIVoiceConverter } from "./apiBase.js";
import { APIVoiceConverterError } from "./apiSelfHostError.js";
import { convertLanguageCodeToISO } from "./common.js";
import { TimeMeasure } from "../common/timer.js";
import { API_TIMEOUT_MS } from "../const.js";
import { trackRecognitionTime } from "../monitoring/newrelic.js";
import { Logger } from "../logger/index.js";
import { getResponseErrorData } from "../server/error.js";
import { unknownHasMessage, unknownHasText } from "../common/unknown.js";

const logger = new Logger("self-api-recognition");

type ApiResponse = {
  text: string;
};

export class ApiSelfHost extends APIVoiceConverter<ApiResponse> {
  private readonly apiToken: string;

  constructor(baseUrl: string, token: string, useRawFile: boolean, healthUrl: string) {
    super("API.SelfHosted", baseUrl, useRawFile, healthUrl);
    this.apiToken = token;
    if (!this.apiToken) {
      logger.warn("The api token is not provided");
    }
  }

  protected async recognise(
    file: {
      data: Buffer;
      name: string;
      duration: number;
    },
    lang: LanguageCode,
    logPrefix: string,
  ): Promise<string> {
    const duration = new TimeMeasure();
    const url = this.url;

    try {
      const language = convertLanguageCodeToISO(lang);

      const fileName =
        !this.useRawFile && !file.name.endsWith(".wav") ? `${file.name}.wav` : file.name;

      // Build the multipart body manually from Buffers instead of FormData+Blob.
      // Blob data is held in the internal native blob store which is invisible
      // to process.memoryUsage() and only freed on GC finalization (unbounded
      // RSS growth), while Buffers are tracked and released deterministically.
      const boundary = `----VoiceToTextFormBoundary${nanoid()}`;
      const head = Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="language"\r\n\r\n` +
          `${language}\r\n` +
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
          `Content-Type: application/octet-stream\r\n\r\n`,
      );
      const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([head, file.data, tail]);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          ...(this.apiToken ? { Authorization: `Bearer ${this.apiToken}` } : {}),
        },
        body,
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });

      if (!response.ok) {
        const data = await getResponseErrorData(response);
        const errorMessage = "Recognition api fetch failed";
        const requestError = new APIVoiceConverterError(new Error(errorMessage), errorMessage)
          .setUrl(url)
          .setResponse(data)
          .setResponseCode(response.status);
        throw requestError;
      }

      const recognition = await response.json();

      if (!this.isRecognitionResponse(recognition)) {
        const errorMessage = "Wrong api response object";
        const requestError = new APIVoiceConverterError(new Error(errorMessage), errorMessage)
          .setUrl(url)
          .setResponse(JSON.stringify(recognition))
          .setResponseCode(response.status);
        throw requestError;
      }

      const timeTotalMs = duration.getMs();
      const perSec = trackRecognitionTime("API_SELF", timeTotalMs, file.duration);
      logger.info(
        `${logPrefix} Voice recognition api took ${timeTotalMs}ms to finish. Recognition speed: ${perSec}ms per sec`,
      );

      return recognition.text;
    } catch (err) {
      if (err instanceof APIVoiceConverterError) {
        throw err;
      }

      const requestError = new APIVoiceConverterError(
        err,
        unknownHasMessage(err) ? err.message : undefined,
      ).setUrl(url);
      throw requestError;
    }
  }

  protected isRecognitionResponse(response: unknown): response is ApiResponse {
    return unknownHasText(response);
  }
}
