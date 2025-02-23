import { BotCommandOption } from "./types.js";
import { BotCommand } from "./commands.js";

export const getBotMenuCommands = (): BotCommandOption[] => [
  new BotCommandOption(BotCommand.Support),
  new BotCommandOption(BotCommand.Donate),
  new BotCommandOption(BotCommand.Subscription),
  new BotCommandOption(BotCommand.Language),
  new BotCommandOption(BotCommand.Start),
];
