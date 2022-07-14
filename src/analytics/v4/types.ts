import { BotCommand } from "../../telegram/types";
import { TimeMeasure } from "../../common/timer";

interface AnalyticsEventBase {
  params: {
    app_version: string;
    thread_id: number;
    engagement_time_msec: "1";
    language: string;
    page_location: string;
  };
}

type AnalyticsError = AnalyticsEventBase & {
  name: "failure";
  params: {
    message: string;
  };
};

type AnalyticsTime = AnalyticsEventBase & {
  name: "time";
  params: {
    name: string;
    duration: number;
  };
};

type AnalyticsFlow = AnalyticsEventBase & {
  name: "flow";
};

export type AnalyticsEvent = AnalyticsError | AnalyticsTime | AnalyticsFlow;

export const EVENTS_LIMIT_GA = 25;

const defaultLang = "not provided";

type AnalyticsAction = BotCommand | "/voice" | "/app";

export class AnalyticsDataV4 {
  private readonly timer: TimeMeasure;
  private events: AnalyticsEvent[] = [];
  private id = 0;
  private lang = defaultLang;
  private command: AnalyticsAction = "/app";

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

  public getId(): number {
    return this.id;
  }

  public getEvents(): AnalyticsEvent[] {
    this.addTime("command-execution", this.timer.getMs());
    return this.events;
  }

  public setLang(lang: string): this {
    this.lang = lang || defaultLang;
    return this;
  }

  public setCommand(command: AnalyticsAction): this {
    this.command = command;
    return this;
  }

  public addFlow() {
    const event: AnalyticsFlow = {
      name: "flow",
      params: {
        app_version: this.appVersion,
        page_location: `${this.url}${this.command}`,
        thread_id: this.threadId,
        engagement_time_msec: "1",
        language: this.lang,
      },
    };
    this.events.push(event);
    return this;
  }

  public addError(message: string): this {
    const event: AnalyticsError = {
      name: "failure",
      params: {
        message,
        app_version: this.appVersion,
        page_location: `${this.url}${this.command}`,
        thread_id: this.threadId,
        engagement_time_msec: "1",
        language: this.lang,
      },
    };
    this.events.push(event);
    return this;
  }

  public addTime(name: string, ms: number) {
    const event: AnalyticsTime = {
      name: "time",
      params: {
        name,
        duration: ms,
        app_version: this.appVersion,
        page_location: `${this.url}${this.command}`,
        thread_id: this.threadId,
        engagement_time_msec: "1",
        language: this.lang,
      },
    };
    this.events.push(event);
    return this;
  }
}
