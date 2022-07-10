import fetch from "isomorphic-fetch";
import { Logger } from "../logger";
import { LanguageCode, VoiceConverter, VoiceConverterOptions } from "./types";
import { getWav } from "../ogg";

const logger = new Logger("wit-ai-recognition");

export class WithAiProvider extends VoiceConverter {
  public static readonly url = "https://api.wit.ai";
  public static readonly timeout = 60_000;
  private static readonly apiVersion = "20220622";
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
    lang: LanguageCode
  ): Promise<string> {
    const name = `${fileId}.ogg`;
    logger.info(`Starting process for ${Logger.y(name)}`);
    return getWav(fileLink)
      .then((bufferData) => {
        logger.info(`Start converting ${Logger.y(name)}`);
        const token = lang === LanguageCode.Ru ? this.tokenRu : this.tokenEn;
        return this.recogniseSpeech(bufferData, token);
      })
      .then((data) => data.text || "");
  }

  private recogniseSpeech(
    data: Buffer,
    authToken = ""
  ): Promise<WitAiSpeechResponse> {
    if (!authToken) {
      return Promise.reject(new Error("The auth token is not provided"));
    }

    const path = "speech";
    // TODO timeout === WithAiProvider.timeout
    const apiRequest = fetch(
      `${WithAiProvider.url}/${path}?v=${WithAiProvider.apiVersion}`,
      {
        body: data,
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "application/json",
          "Content-Type": "audio/wav",
          "Transfer-Encoding": "chunked",
        },
      }
    );

    return apiRequest
      .then((response) => Promise.all([response.text(), response.status]))
      .then(([contents, status]) => {
        if (status !== 200) {
          throw new Error("The api request was unsuccessful");
        }
        const chunks =
          WithAiProvider.parseChunkedResponse<WitAiSpeechResponse>(contents);
        const final = chunks.find((chunk) => chunk.is_final);
        if (!final) {
          throw new Error(
            "The final response chunk not found. Transcription is empty."
          );
        }
        return final;
      });
  }

  private static parseChunkedResponse<Dto>(body: string): Dto[] {
    // Split by newline, trim, remove empty lines
    const chunks = body
      .split("\r\n")
      .map((chunk) => chunk.trim())
      .filter((chunk) => Boolean(chunk.length));

    // Loop through the chunks and try to Json.parse
    return chunks.reduce<{ prev: string; acc: Dto[] }>(
      ({ prev, acc }, chunk) => {
        const newPrev = `${prev}${chunk}`;
        try {
          const newChunk: Dto = JSON.parse(newPrev);
          return { prev: "", acc: [...acc, newChunk] };
        } catch (err) {
          return { prev: newPrev, acc };
        }
      },
      { prev: "", acc: [] }
    ).acc;
  }
}

interface WitAiSpeechResponse {
  entities: Record<string, WitAiEntity>;
  intents: WitAiIntent[];
  text?: string;
  traits: Record<string, WitAiIntent>;
  is_final?: boolean;
}

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
