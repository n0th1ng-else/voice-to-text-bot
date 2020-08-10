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

  public getDto(
    token: string,
    type: AnalyticsHitType = AnalyticsHitType.Event
  ): AnalyticsDataDto {
    return {
      v: this.apiVersion,
      tid: token,
      uid: String(this.id),
      dp: encodeURIComponent(this.command),
      dr: encodeURIComponent(TelegramApi.url),
      ul: this.lang,
      t: type,
      an: encodeURIComponent(this.appName),
      av: encodeURIComponent(this.appVersion),
      srt: this.timer.getMs(),
      ec: encodeURIComponent(this.category),
      ea: encodeURIComponent(this.action),
      el: encodeURIComponent(this.text),
      dt: encodeURIComponent(this.text),
      ds: "nodejs",
    };
  }
}

export interface AnalyticsDataDto {
  // The Protocol version
  v: string;
  // The measurement ID
  tid: string;
  // When present, the IP address of the sender will be anonymized
  aip?: number;
  // Indicates the data source of the hit.
  ds?: string;
  // User Id
  uid: string;
  // Specifies which referral source brought traffic to a website
  dr: string;
  // Specifies the language
  ul: string;
  // Event hit type.
  t: AnalyticsHitType;
  // Specifies the application name
  an: string;
  // Specifies the application version
  av: string;
  // Event category.
  ec: string;
  // Event action.
  ea: string;
  // Event label.
  el: string;
  // Server response time in milliseconds
  srt: number;
  // The path portion of the page URL
  dp: string;
  // Document title
  dt: string;
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
