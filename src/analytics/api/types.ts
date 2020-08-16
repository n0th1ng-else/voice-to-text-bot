import { TimeMeasure } from "../../common/timer";
import { BotCommand } from "../../telegram/types";
import { TelegramApi } from "../../telegram/api";

export class AnalyticsData {
  private readonly timer: TimeMeasure;
  private readonly apiVersion = "1";
  private readonly appName = "Voice to Speech Bot";
  private readonly action = "User message";
  private readonly appType = "NodeJS";

  private command = "/";
  private text = "";
  private errorMessages: string[] = [];
  private id = 0;
  private lang = "not provided";

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
    this.lang = lang || "not provided";
    return this;
  }

  public setCommand(text: string, command: BotCommand | string = "/"): this {
    this.command = command;
    this.text = text;
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

  private getEventDto(token: string): AnalyticsDataDto {
    return {
      v: this.apiVersion,
      tid: token,
      cid: String(this.id),
      t: AnalyticsHitType.Event,
      //
      dh: encodeURIComponent(this.url),
      dp: encodeURIComponent(this.command),
      dr: encodeURIComponent(TelegramApi.url),
      ul: encodeURIComponent(this.lang),
      an: encodeURIComponent(this.appName),
      av: encodeURIComponent(this.appVersion),
      ec: encodeURIComponent(`Thread ${this.threadId}`),
      ea: encodeURIComponent(this.action),
      el: encodeURIComponent(this.text),
      dt: encodeURIComponent(this.text),
      ds: encodeURIComponent(this.appType),
    };
  }

  private getTimingDto(token: string): AnalyticsDataDto {
    return {
      v: this.apiVersion,
      tid: token,
      cid: String(this.id),
      t: AnalyticsHitType.Timing,
      //
      utt: this.timer.getMs(),
      utc: encodeURIComponent("Server Timing"),
      utv: encodeURIComponent(this.command),
      utl: encodeURIComponent(`Thread ${this.threadId}`),
    };
  }

  private getErrorDto(token: string, message: string): AnalyticsDataDto {
    return {
      v: this.apiVersion,
      tid: token,
      cid: String(this.id),
      t: AnalyticsHitType.Exception,
      //
      exf: 0,
      exd: encodeURIComponent(message),
    };
  }
}

export interface AnalyticsDataDto {
  // Required

  // The Protocol version
  v: string;
  // The measurement ID
  tid: string;
  // User Id
  cid: string;
  // Event hit type.
  t: AnalyticsHitType;

  // Optional

  // When present, the IP address of the sender will be anonymized
  aip?: number;
  // Indicates the data source of the hit.
  ds?: string;
  // Specifies which referral source brought traffic to a website
  dr?: string;
  // Specifies the language
  ul?: string;
  // Specifies the application name
  an?: string;
  // Specifies the application version
  av?: string;
  // Event category.
  ec?: string;
  // Event action.
  ea?: string;
  // Event label.
  el?: string;
  // Server response time in milliseconds
  srt?: number;
  // User timing value
  utt?: number;
  // User timing category
  utc?: string;
  // User timing variable
  utv?: string;
  // The path portion of the page URL
  dp?: string;
  // Document title
  dt?: string;
  // Error description
  exd?: string;
  // Is error fatal
  exf?: 0 | 1;
  // Specifies the hostname from which content was hosted
  dh?: string;
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
