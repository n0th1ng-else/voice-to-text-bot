import type { LanguageCode } from "./types.js";
import { APIVoiceConverter, APIVoiceConverterError } from "./apiBase.js";
import { convertLanguageCodeToISO } from "./common.js";
import { TimeMeasure } from "../common/timer.js";
import { API_TIMEOUT_MS } from "../const.js";
import { trackRecognitionTime } from "../monitoring/newrelic.js";
import { Logger } from "../logger/index.js";
import { getResponseErrorData } from "../server/error.js";
import { unknownHasMessage, unknownHasText } from "../common/unknown.js";

const logger = new Logger("whisper-api-recognition");

type ApiResponse = {
  text: string;
};

export class WhisperSelfHost extends APIVoiceConverter<ApiResponse> {
  private readonly apiToken: string;
  protected readonly url: string;

  constructor(baseUrl: string, token: string) {
    super("Whisper.SelfHosted");
    this.apiToken = token;
    this.url = baseUrl;
  }

  protected async recognise(
    file: {
      data: Buffer<ArrayBufferLike>;
      name: string;
      type: "audio/wav";
    },
    lang: LanguageCode,
    logPrefix: string,
  ): Promise<string> {
    if (!this.apiToken) {
      throw new Error("The api token is not provided");
    }

    const duration = new TimeMeasure();
    const url = `${this.url}/transcribe`;

    try {
      const language = convertLanguageCodeToISO(lang);

      const form = new FormData();
      form.append("language", language);

      // @ts-expect-error Type mismatch
      const fileBlob = new Blob([file.data], { type: file.type });
      form.append("file", fileBlob, file.name);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
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
    } finally {
      const timeTotalMs = duration.getMs();
      logger.info(`${logPrefix} Voice recognition api took ${timeTotalMs}ms to finish`);
      trackRecognitionTime("WHISPER_SELF", timeTotalMs);
    }
  }

  protected isRecognitionResponse(response: unknown): response is ApiResponse {
    return unknownHasText(response);
  }
}
