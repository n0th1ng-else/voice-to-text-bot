import { Voice } from "node-telegram-bot-api";

export interface TelegramApiVoice extends Voice {
  file_unique_id: string;
}
