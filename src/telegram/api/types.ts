export interface TgCore<Response> {
  /**
   * Highlights if the request was successful
   */
  ok: boolean;
  result: Response;
  description?: string;
  error_code?: number;
  parameters?: TgErrorParameters;
}

export interface TgErrorParameters {
  migrate_to_chat_id?: number;
  /**
   * If present, tell us when we can retry the request, in seconds
   */
  retry_after?: number;
}

export interface TgWebHook {
  url: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
  pre_checkout_query?: TgCheckoutQuery;
}

export interface TgMessage {
  message_id: number;
  date: number;
  chat: TgChat;
  text?: string;
  from?: TgUser;
  voice?: TgMedia;
  audio?: TgMedia;
  video_note?: TgMedia;
  successful_payment?: SuccessfulPayment;
}

export interface TgChat {
  id: number;
  type: TgChatType;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TgMedia {
  file_id: string;
  duration: number;
  mime_type?: string;
}

export enum TgChatType {
  Private = "private",
  Group = "group",
  SuperGroup = "supergroup",
  Channel = "channel",
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

interface Payment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
}

export interface TgCheckoutQuery extends Payment {
  id: string;
  from: TgUser;
}

export interface SuccessfulPayment extends Payment {
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TgInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface BotCommandListDto {
  commands: BotCommandDto[];
}

export interface BotCommandDto {
  command: string;
  description: string;
}

export interface MessageDto {
  chat_id: number;
  text: string;
  message_id?: number;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: {
    inline_keyboard: TgInlineKeyboardButton[][];
  };
}

interface LabeledPrice {
  label: string;
  amount: number; // Integer cents
}

export interface InvoiceDto {
  chat_id: number;
  title: string; // Product name
  description: string; // Product description
  payload: string; // Internal data
  provider_token: string; // Provider token
  currency: string; // EUR
  prices: LabeledPrice[];
  start_parameter: string; // donation id
  photo_url: string;
  photo_width: number;
  photo_height: number;
}

export interface PreCheckoutQueryDto {
  pre_checkout_query_id: string;
  ok: boolean;
  error_message?: string;
}

export interface EditMessageDto {
  chat_id?: number | string;
  message_id?: number;
  text: string;
}

export interface FileDto {
  file_id: string;
}

export interface TgFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export class TgError extends Error {
  public code = 0;
  public response?: TgCore<void>;
  public migrateToChatId = 0;
  public retryAfter = 0;
  public url = "";

  constructor(message = "Telegram request was unsuccessful", stack?: string) {
    super(`ETELEGRAM ${message}`);
    if (stack) {
      this.stack = `${this.stack}\n${stack}`;
    }
  }

  public setErrorCode(code = 0): this {
    this.code = code;
    return this;
  }

  public setResponse(response?: TgCore<void>): this {
    this.response = response;
    return this;
  }

  public setRetryAfter(retryAfter = 0): this {
    this.retryAfter = retryAfter;
    return this;
  }

  public setMigrateToChatId(migrateToChatId = 0): this {
    this.migrateToChatId = migrateToChatId;
    return this;
  }

  public setUrl(url: string): this {
    this.url = url;
    return this;
  }
}
