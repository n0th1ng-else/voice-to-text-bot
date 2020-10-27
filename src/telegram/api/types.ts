export interface TgCore<Response> {
  ok: boolean;
  result: Response;
  description?: string;
  error_code?: number;
  parameters?: TgErrorParameters;
}

export interface TgErrorParameters {
  migrate_to_chat_id?: number;
  retry_after?: number;
}

export interface TgWebHook {
  url: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export interface TgMessage {
  message_id: number;
  date: number;
  chat: TgChat;
  text?: string;
  from?: TgUser;
  voice?: TgAudio;
  audio?: TgAudio;
}

export interface TgChat {
  id: number;
  type: TgChatType;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TgAudio {
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

export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TgSendMessageOptions {
  reply_markup: {
    inline_keyboard: TgInlineKeyboardButton[][];
  };
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
  reply_markup?: {
    inline_keyboard: TgInlineKeyboardButton[][];
  };
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
  public response = "";
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

  public setResponse(response = ""): this {
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
