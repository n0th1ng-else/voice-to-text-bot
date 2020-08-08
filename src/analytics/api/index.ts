import axios, { AxiosInstance } from "axios";
import { AnalyticsDataDto } from "./types";

export class GoogleAnalyticsApi {
  public static readonly url = "https://www.google-analytics.com";
  public static readonly timeout = 60_000;

  private static readonly path = "collect";

  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      method: "GET",
      baseURL: GoogleAnalyticsApi.url,
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36",
        "Content-Type": "application/json",
      },
      timeout: GoogleAnalyticsApi.timeout,
      responseType: "json",
    });
  }

  public collect(dto: AnalyticsDataDto): Promise<void> {
    const query = Object.keys(dto)
      .map((key) => `${key}=${dto[key]}`)
      .join("&");
    return this.request<void, void>(`${GoogleAnalyticsApi.path}?${query}`);
  }

  private request<Response, Data>(
    methodName: string,
    data?: Data
  ): Promise<Response> {
    const url = this.getApiUrl(methodName);
    return this.client
      .request<Response>({ url, data })
      .then((response) => response.data);
  }

  private getApiUrl(methodName: string): string {
    return `/${methodName}`;
  }
}
