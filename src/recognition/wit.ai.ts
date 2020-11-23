import axios, { AxiosInstance } from "axios";
import { Logger } from "../logger";
import { LanguageCode, VoiceConverter, VoiceConverterOptions } from "./types";
import { getWav } from "../ogg";

const logger = new Logger("wit-ai-recognition");

export class WithAiProvider extends VoiceConverter {
  private readonly tokenEn: string;
  public static readonly url = "https://api.wit.ai";
  public static readonly timeout = 60_000;
  private readonly tokenRu: string;
  private readonly client: AxiosInstance;

  constructor(options: VoiceConverterOptions) {
    super();

    logger.info("Using Wit.ai");
    this.tokenEn = options.witAiTokenEn || "";
    this.tokenRu = options.witAiTokenRu || "";

    this.client = axios.create({
      method: "POST",
      baseURL: WithAiProvider.url,
      timeout: WithAiProvider.timeout,
      responseType: "json",
    });
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
        return this.recognise(bufferData, token);
      })
      .then((data) => data.text);
  }

  private recognise(data: Buffer, authToken = ""): Promise<WitAiResponse> {
    if (!authToken) {
      return Promise.reject(new Error("The auth token is not provided"));
    }
    return this.client
      .request<WitAiResponse>({
        data,
        url: "/speech",
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "application/json",
          "Content-Type": "audio/wav",
        },
      })
      .then((res) => res.data);
  }
}

interface WitAiResponse {
  entities: Record<string, WitAiEntity>;
  intents: WitAiIntent[];
  text: string;
  traits: Record<string, WitAiIntent>;
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
