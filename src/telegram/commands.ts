import type { ValueOf } from "../common/types.js";

export const BotCommand = {
  Start: "/start",
  Language: "/lang",
  Support: "/support",
  Donate: "/donate",
} as const;

export type BotCommandType = ValueOf<typeof BotCommand>;
