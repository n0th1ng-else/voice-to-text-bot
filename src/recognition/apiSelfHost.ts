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
      data: Blob;
      name: string;
      duration: number;
    },
    lang: LanguageCode,
    logPrefix: string,
  ): Promise<string> {
    const duration = new TimeMeasure();
    const url = this.url;

    let form: null | FormData = new FormData();

    try {
      const language = convertLanguageCodeToISO(lang);

      form.append("language", language);

      const fileName =
        !this.useRawFile && !file.name.endsWith(".wav") ? `${file.name}.wav` : file.name;
      form.append("file", file.data, fileName);

      const response = await fetch(url, {
        method: "POST",
        headers: this.apiToken
          ? {
              Authorization: `Bearer ${this.apiToken}`,
            }
          : {},
        body: form,
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
    } finally {
      // eslint-disable-next-line no-useless-assignment
      form = null;
    }
  }

  protected isRecognitionResponse(response: unknown): response is ApiResponse {
    return unknownHasText(response);
  }
}
