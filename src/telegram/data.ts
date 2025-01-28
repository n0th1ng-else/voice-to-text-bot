import { BotCommand, BotCommandOption } from "./types.ts";

export const getBotMenuCommands = (): BotCommandOption[] => [
  new BotCommandOption(BotCommand.Support),
  new BotCommandOption(BotCommand.Donate),
  new BotCommandOption(BotCommand.Language),
  new BotCommandOption(BotCommand.Start),
];
