import { TimeMeasure } from "../../common/timer.js";
import { BotCommand } from "../../telegram/types.js";
import { TelegramApi } from "../../telegram/api/index.js";
import { AnalyticsDataV4 } from "../v4/types.js";

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
  public v4: AnalyticsDataV4;

  constructor(
    private readonly appVersion: string,
    private readonly url: string,
    private readonly threadId: number
  ) {
    this.v4 = new AnalyticsDataV4(appVersion, url, threadId);
    this.timer = new TimeMeasure();
  }

  public setId(id: number): this {
    this.id = id;
    this.v4.setId(this.id);
    return this;
  }

  public setLang(lang: string): this {
    this.lang = lang || defaultLang;
    this.v4.setLang(this.lang);
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
    this.v4.setCommand(category);
    this.v4.addFlow();
    return this;
  }

  public setError(errorMessage: string): this {
    this.errorMessages.push(errorMessage);
    this.v4.addError(errorMessage);
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
      dr: TelegramApi.url,
      av: this.getAppVersion(this.appVersion, this.threadId),
      //
      dh: this.url,
      dp: category,
      dt: this.getTitle(category),
      an: this.appName,
      ul: this.lang,
    };
  }

  private getTitle(action: AnalyticsAction): string {
    const title = action.substring(1);
    return `${title[0].toUpperCase()}${title.substring(1)}`;
  }

  private getAppVersion(version: string, threadId: number): string {
    return `${version}.${threadId}`;
  }

  private getEventDto(token: string): AnalyticsDataDto {
    return {
      v: this.apiVersion,
      tid: token,
      uid: String(this.id),
      ds: AnalyticsDataSource.App,
      t: AnalyticsHitType.Event,
      //
      dr: TelegramApi.url,
      av: this.getAppVersion(this.appVersion, this.threadId),
      //
      dh: this.url,
      dp: this.category,
      dt: this.getTitle(this.category),
      an: this.appName,
      ul: this.lang,

      // user command, bot response (AnalyticsHitCategory)
      ec: this.category,
      // Event action - start, lang, support...
      ea: this.action,
      // Event label - request data / response
      el: this.label,
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
      dr: TelegramApi.url,
      av: this.getAppVersion(this.appVersion, this.threadId),
      ul: this.lang,
      utt: this.timer.getMs(),
      utc: "Server Timing",
      utv: this.action,
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
      dr: TelegramApi.url,
      av: this.getAppVersion(this.appVersion, this.threadId),
      ul: this.lang,
      exf: false,
      exd: message,
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
  exf?: boolean;
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
