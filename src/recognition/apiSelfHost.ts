import type { LanguageCode } from "./types.js";
import { APIVoiceConverter, APIVoiceConverterError } from "./apiBase.js";
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

  constructor(baseUrl: string, token: string, useRawFile: boolean) {
    super("API.SelfHosted", baseUrl, useRawFile);
    this.apiToken = token;
  }

  protected async recognise(
    file: {
      data: Buffer<ArrayBufferLike>;
      name: string;
      type: "audio/wav";
      duration: number;
    },
    lang: LanguageCode,
    logPrefix: string,
  ): Promise<string> {
    if (!this.apiToken) {
      logger.warn("The api token is not provided");
    }

    const duration = new TimeMeasure();
    const url = this.url;

    try {
      const language = convertLanguageCodeToISO(lang);

      const form = new FormData();
      form.append("language", language);

      // @ts-expect-error Type mismatch
      const fileBlob = new Blob([file.data], { type: file.type });
      const fileName =
        !this.useRawFile && !file.name.endsWith(".wav") ? `${file.name}.wav` : file.name;
      form.append("file", fileBlob, fileName);

      const response = await fetch(url, {
        method: "POST",
        headers: this.apiToken
          ? {
              Authorization: `Bearer ${this.apiToken}`,
            }
          : {},
        body: form,
        duplex: "half",
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
          .setResponse(recognition)
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
