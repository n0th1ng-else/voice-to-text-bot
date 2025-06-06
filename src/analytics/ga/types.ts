import type { BotCommandType } from "../../telegram/commands.js";
import { TimeMeasure } from "../../common/timer.js";
import { TelegramBaseApi } from "../../telegram/api/groups/core.js";
import type { ChatId } from "../../telegram/api/core.js";

type AnalyticsEventBaseParams = {
  app_version: string;
  thread_id: number;
  engagement_time_msec: number;
  language: string;
  page_location: string;
  page_title: string;
  page_referrer: typeof TelegramBaseApi.url;
  screen_resolution: "1920x1080";
  page_meta: string;
};

type WithArbitraryParams = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
};

type AnalyticsError = {
  name: "app_exception";
  params: {
    message: string;
    fatal: false;
    timestamp: string;
  };
};

type AnalyticsTime = {
  name: "time";
  params: {
    name: string;
    duration: number;
  };
};

type AnalyticsFlow = {
  name: "flow";
} & WithArbitraryParams;

type AnalyticsFirstVisit = {
  name: "app_init";
} & WithArbitraryParams;

type AnalyticsPageVisit = {
  name: "page_view";
} & WithArbitraryParams;

export type AnalyticsEvent =
  | AnalyticsError
  | AnalyticsTime
  | AnalyticsFlow
  | AnalyticsFirstVisit
  | AnalyticsPageVisit;

export type AnalyticsEventExt = AnalyticsEvent & {
  params: AnalyticsEventBaseParams;
};

export const EVENTS_LIMIT_GA = 25;

const defaultLang = "not provided";

type AnalyticsAction = BotCommandType | "/voice" | "/app" | "/ignore";

export class AnalyticsData {
  private readonly timer: TimeMeasure;
  private readonly appVersion: string;
  private readonly url: string;
  private readonly threadId: number;
  private readonly events: AnalyticsEvent[] = [];
  private id: ChatId = 0 as ChatId;
  private lang = defaultLang;
  private command: AnalyticsAction = "/app";
  private commandTitle = "";
  private commandMeta = "";
  private readonly title = "Audio Message Bot";

  constructor(appVersion: string, url: string, threadId: number) {
    this.appVersion = appVersion;
    this.url = url;
    this.threadId = threadId;
    this.timer = new TimeMeasure();
  }

  public setId(id: ChatId): this {
    this.id = id;
    return this;
  }

  public getId(): ChatId {
    return this.id;
  }

  public getEvents(): AnalyticsEventExt[] {
    const time = this.timer.getMs();
    this.addTime("command-execution", time);
    const base: AnalyticsEventBaseParams = {
      app_version: this.appVersion,
      page_location: `${this.url}${this.command}`,
      page_title: `${this.title} ${this.commandTitle || this.command}`,
      thread_id: this.threadId,
      engagement_time_msec: time,
      language: this.lang,
      screen_resolution: "1920x1080",
      page_referrer: TelegramBaseApi.url,
      page_meta: this.commandMeta,
    };

    return this.events.map((event) => ({
      ...event,
      params: {
        ...event.params,
        ...base,
      },
    }));
  }

  public setLang(lang: string): this {
    this.lang = lang || defaultLang;
    return this;
  }

  public setCommand(
    command: AnalyticsAction,
    commandTitle: string,
    commandMeta = "",
  ): this {
    this.command = command;
    this.commandTitle = commandTitle;
    this.commandMeta = commandMeta;
    return this;
  }

  public addFlow() {
    const event: AnalyticsFlow = {
      name: "flow",
    };
    this.events.push(event);
    return this;
  }

  public addError(message: string): this {
    const event: AnalyticsError = {
      name: "app_exception",
      params: {
        message,
        fatal: false,
        timestamp: new Date().toISOString(),
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
      },
    };
    this.events.push(event);
    return this;
  }

  public addFirstVisit(): this {
    const event: AnalyticsFirstVisit = {
      name: "app_init",
    };
    this.events.push(event);
    return this;
  }

  public addPageVisit(): this {
    const event: AnalyticsPageVisit = {
      name: "page_view",
    };
    this.events.push(event);
    return this;
  }
}
