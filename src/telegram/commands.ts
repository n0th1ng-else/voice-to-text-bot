import type { ValueOf } from "../common/types.js";
import type { BotMessageModel } from "./model.js";
import type { TgMessage } from "./api/types.js";
import { telegramBotName } from "../env.js";

export const BotCommand = {
  Start: "/start",
  Language: "/lang",
  Support: "/support",
  Donate: "/donate",
} as const;

export type BotCommandType = ValueOf<typeof BotCommand>;

export const isCommandMessage = (
  model: BotMessageModel,
  msg: TgMessage,
  command: BotCommandType,
): boolean => {
  if (!msg?.text) {
    return false;
  }

  if (msg.text === String(command)) {
    return true;
  }

  if (!telegramBotName) {
    return false;
  }

  return (
    model.isGroup &&
    msg.text.toLowerCase() === `${command}@${telegramBotName.toLowerCase()}`
  );
};
