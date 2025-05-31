import { telegramBotName } from "../env.js";
import type { BotMessageModel } from "./model.js";
import type { TgMessage } from "./api/types.js";
import type { BotCommandType } from "./commands.js";

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
