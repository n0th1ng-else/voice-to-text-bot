import { TimeMeasure } from "../../common/timer";
import { BotCommand } from "../../telegram/types";
import { TelegramApi } from "../../telegram/api";

export class AnalyticsData {
  private readonly timer: TimeMeasure;
  private readonly apiVersion = "1";
  private readonly appName = "Voice to Speech Bot";
  private readonly category = "Telegram bot";
  private readonly action = "User message";

  private command = "/";
  private text = "";
  private errorMessage = "";

  constructor(
    private readonly appVersion: string,
    private readonly id: number,
    private readonly lang: string
  ) {
    this.timer = new TimeMeasure();
  }

  public setCommand(text: string, command: BotCommand | string = "/"): this {
    this.command = command;
    this.text = text;
    return this;
  }

  public setError(errorMessage: string): this {
    this.errorMessage = errorMessage;
    return this;
  }

  public getListDto(token: string): AnalyticsDataDto[] {
    const regular = [this.getEventDto(token), this.getTimingDto(token)];
    return this.errorMessage ? [...regular, this.getErrorDto(token)] : regular;
  }

  private getEventDto(token: string): AnalyticsDataDto {
    return {
      v: this.apiVersion,
      tid: token,
      cid: String(this.id),
      t: AnalyticsHitType.Event,
      //
      dp: encodeURIComponent(this.command),
      dr: encodeURIComponent(TelegramApi.url),
      ul: encodeURIComponent(this.lang),
      an: encodeURIComponent(this.appName),
      av: encodeURIComponent(this.appVersion),
      ec: encodeURIComponent(this.category),
      ea: encodeURIComponent(this.action),
      el: encodeURIComponent(this.text),
      dt: encodeURIComponent(this.text),
      ds: "nodejs",
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
      utc: "ServerTiming",
      utv: encodeURIComponent(this.command),
      ul: encodeURIComponent(this.lang),
    };
  }

  private getErrorDto(token: string): AnalyticsDataDto {
    return {
      v: this.apiVersion,
      tid: token,
      cid: String(this.id),
      t: AnalyticsHitType.Exception,
      //
      exf: 0,
      exd: this.errorMessage,
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
