import { TimeMeasure } from "../../common/timer";
import { BotCommand } from "../../telegram/types";
import { TelegramApi } from "../../telegram/api";

const defaultLang = "not provided";

type AnalyticsAction = BotCommand | "/voice" | "/app";

export class AnalyticsData {
  private readonly timer: TimeMeasure;
  private readonly apiVersion = "1";
  private readonly appName = "Voice to Speech Bot";

  private category: AnalyticsAction = "/app";
  private action = "";
  private label = "";
  private errorMessages: string[] = [];
  private id = 0;
  private lang = defaultLang;

  constructor(
    private readonly appVersion: string,
    private readonly url: string,
    private readonly threadId: number
  ) {
    this.timer = new TimeMeasure();
  }

  public setId(id: number): this {
    this.id = id;
    return this;
  }

  public setLang(lang: string): this {
    this.lang = lang || defaultLang;
    return this;
  }

  public setCommand(
    category: AnalyticsAction,
    action: string,
    label?: string
  ): this {
    this.category = category;
    this.action = action;
    this.label = label || "";
    return this;
  }

  public setError(errorMessage: string): this {
    this.errorMessages.push(errorMessage);
    return this;
  }

  public getListDto(token: string): AnalyticsDataDto[] {
    const regular = [this.getEventDto(token), this.getTimingDto(token)];
    const errors = this.errorMessages.map((msg) =>
      this.getErrorDto(token, msg)
    );
    return this.errorMessages.length ? [...regular, ...errors] : regular;
  }

  public getPageDto(
    token: string,
    category: AnalyticsAction
  ): AnalyticsDataDto {
    // Category is not set at this moment. force to specify it
    return {
      v: this.apiVersion,
      tid: token,
      uid: String(this.id),
      ds: AnalyticsDataSource.App,
      t: AnalyticsHitType.PageView,
      //
      dr: encodeURIComponent(TelegramApi.url),
      av: encodeURIComponent(this.appVersion),
      //
      dh: encodeURIComponent(this.url),
      dp: encodeURIComponent(category),
      dt: encodeURIComponent(this.getTitle(category)),
      an: encodeURIComponent(this.appName),
      ul: encodeURIComponent(this.lang),
    };
  }

  private getTitle(action: AnalyticsAction): string {
    const title = action.substring(1);
    return `${title[0].toUpperCase()}${title.substring(1)}`;
  }

  private getCid(threadId: number): string {
    return `Thread #${threadId}`;
  }

  private getEventDto(token: string): AnalyticsDataDto {
    return {
      v: this.apiVersion,
      tid: token,
      uid: String(this.id),
      ds: AnalyticsDataSource.App,
      t: AnalyticsHitType.Event,
      //
      dr: encodeURIComponent(TelegramApi.url),
      av: encodeURIComponent(this.appVersion),
      //
      dh: encodeURIComponent(this.url),
      dp: encodeURIComponent(this.category),
      dt: encodeURIComponent(this.getTitle(this.category)),
      an: encodeURIComponent(this.appName),
      ul: encodeURIComponent(this.lang),

      // user command, bot response (AnalyticsHitCategory)
      ec: encodeURIComponent(this.category),
      // Event action - start, lang, support...
      ea: encodeURIComponent(this.action),
      // Event label - request data / response
      el: encodeURIComponent(this.label),
      ev: this.threadId,
    };
  }

  private getTimingDto(token: string): AnalyticsDataDto {
    return {
      v: this.apiVersion,
      tid: token,
      uid: String(this.id),
      ds: AnalyticsDataSource.App,
      t: AnalyticsHitType.Timing,
      //
      ul: encodeURIComponent(this.lang),
      utt: this.timer.getMs(),
      utc: encodeURIComponent("Server Timing"),
      utv: encodeURIComponent(this.action),
    };
  }

  private getErrorDto(token: string, message: string): AnalyticsDataDto {
    return {
      v: this.apiVersion,
      tid: token,
      uid: String(this.id),
      ds: AnalyticsDataSource.App,
      t: AnalyticsHitType.Exception,
      //
      ul: encodeURIComponent(this.lang),
      exf: 0,
      exd: encodeURIComponent(message),
    };
  }
}

export interface AnalyticsDataDto {
  // Required

  // The Protocol version. Always 1
  v: "1";
  // The google analytics tracking ID UA-XXXXXXX-X
  tid: string;
  // Client Id (Thread Id)
  cid?: string;
  // User Id (Chat Id)
  uid: string;
  // Event hit type.
  t: AnalyticsHitType;
  // Indicates the data source of the hit.
  ds: AnalyticsDataSource;

  // Optional

  // Specifies which referral source brought traffic to a website (telegram?)
  dr?: string;
  // Specifies the user language
  ul?: string;
  // Specifies the application name
  an?: string;
  // Specifies the application version
  av?: string;

  // Geo Location Id (country code is available two letters uppercase - US)
  geoid?: string;
  // When present, the IP address of the sender will be anonymized
  aip?: number;

  // Event category.
  ec?: string;
  // Event action
  ea?: string;
  // Event label
  el?: string;

  // Event value
  ev?: number;
  // Server response time in milliseconds
  srt?: number;
  // User timing value
  utt?: number;
  // User timing category
  utc?: string;
  // User timing variable
  utv?: string;

  // Specifies the hostname from which content was hosted
  dh?: string;
  // The path portion of the page URL
  dp?: string;
  // Document title
  dt?: string;

  // Error description
  exd?: string;
  // Is error fatal
  exf?: 0 | 1;
  // Specifies the user timing label
  utl?: string;
}

export enum AnalyticsHitType {
  PageView = "pageview",
  ScreenView = "screenview",
  Event = "event",
  Transaction = "transaction",
  Item = "item",
  Social = "social",
  Exception = "exception",
  Timing = "timing",
}

enum AnalyticsDataSource {
  Web = "web",
  App = "app",
}
