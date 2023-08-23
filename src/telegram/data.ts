import { BotCommand, BotCommandOption } from "./types.js";
import { LabelId } from "../text/types.js";

export const botCommands: BotCommandOption[] = [
  new BotCommandOption(BotCommand.Support, LabelId.SupportCommandDescription),
  new BotCommandOption(BotCommand.Donate, LabelId.DonateCommandDescription),
  new BotCommandOption(BotCommand.Language, LabelId.LanguageCommandDescription),
  new BotCommandOption(BotCommand.Start, LabelId.StartCommandDescription),
];
