import { nanoid } from "nanoid";
import { Logger } from "../../logger/index.js";
import type { ChatId } from "../api/core.js";

export class TelegramMessagePrefix {
  public readonly chatId: ChatId;
  public readonly id: string;

  constructor(chatId: ChatId, id = nanoid(10)) {
    this.chatId = chatId;
    this.id = id;
  }

  public getPrefix(): string {
    return `[Id=${Logger.y(this.id)}] [ChatId=${Logger.y(this.chatId)}]`;
  }
}
